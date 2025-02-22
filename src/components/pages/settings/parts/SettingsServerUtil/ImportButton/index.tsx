import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import {
  Export3,
  V3_COMPATIBLE_SETTINGS,
  V3_SETTINGS_TRANSFORM,
  validateExport,
} from '@/lib/import/version3/validateExport';
import { Alert, Button, Code, FileButton, Modal, Stack } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification, updateNotification } from '@mantine/notifications';
import {
  IconCheck,
  IconDatabaseImport,
  IconDatabaseOff,
  IconDeviceFloppy,
  IconExclamationMark,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import Export3Details from './Export3Details';
import Export3ImportSettings from './Export3ImportSettings';
import Export3UserChoose from './Export3UserChoose';

export default function ImportButton() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [export3, setExport3] = useState<Export3 | null>(null);

  const [importFrom, setImportFrom] = useState('');
  const [importSettings, setImportSettings] = useState(false);

  const onContent = (content: string) => {
    if (!content) return console.error('no content');
    try {
      const data = JSON.parse(content);
      onJson(data);
    } catch (error) {
      console.error('failed to parse file content', error);
    }
  };

  const onJson = (data: unknown) => {
    const validated = validateExport(data);
    if (!validated.success) {
      console.error('Failed to validate import data', validated);
      showNotification({
        title: 'There were errors with the import',
        message:
          "Zipline couldn't validate the import data. Are you sure it's a valid export from Zipline v3? For more details about the error, check the browser console.",
        color: 'red',
        icon: <IconDatabaseOff size='1rem' />,
        autoClose: 10000,
      });
      setOpen(false);
      setFile(null);
      return;
    }
    setExport3(validated.data);
  };

  const handleImportSettings = async (settingsEnv?: Record<string, string>) => {
    if (!settingsEnv) return;

    const toImport: Record<string, any> = {};

    for (const [key, value] of Object.entries(settingsEnv)) {
      if (!(key in V3_COMPATIBLE_SETTINGS)) continue;

      toImport[V3_COMPATIBLE_SETTINGS[key]!] = V3_SETTINGS_TRANSFORM[key]
        ? V3_SETTINGS_TRANSFORM[key](value)
        : value;
    }

    const { error } = await fetchApi<Response['/api/server/settings']>(
      '/api/server/settings',
      'PATCH',
      toImport,
    );

    if (error) {
      showNotification({
        title: 'Failed to import settings',
        message: error.issues
          ? error.issues.map((x: { message: string }) => x.message).join('\n')
          : error.error,
        color: 'red',
      });
    } else {
      showNotification({
        message: 'Settings imported',
        color: 'green',
        icon: <IconDeviceFloppy size='1rem' />,
      });

      await fetch('/reload');
    }
  };

  const handleImport = async () => {
    modals.openConfirmModal({
      title: 'Are you sure?',
      children:
        'This process will NOT overwrite existing data but will append to it. In case of conflicts, the imported data will be skipped and logged. If using a version 3 export, the entire importing process should be completed immediately after setting up Zipline.',
      labels: {
        cancel: 'Cancel',
        confirm: 'Import Data',
      },
      onConfirm: async () => {
        showNotification({
          title: 'Importing Data',
          message:
            'The export file will be uploaded. This may take a few moments. The process is running in the background and is logged, so you can close this browser tab.',
          color: 'blue',
          autoClose: 10000,
          id: 'importing-data',
          loading: true,
        });
        setOpen(false);

        const settingsEnv = importSettings
          ? Object.fromEntries(
              Object.entries(export3!.request.env).filter(([key]) => key in V3_COMPATIBLE_SETTINGS),
            )
          : undefined;

        handleImportSettings(settingsEnv);

        const { error, data } = await fetchApi<Response['/api/server/import/v3']>(
          '/api/server/import/v3',
          'POST',
          {
            export3,
            importFromUser: importFrom === '' ? undefined : importFrom,
            importSettings: settingsEnv,
          },
        );

        if (error) {
          updateNotification({
            title: 'Failed to import data',
            message:
              error.error ??
              'An error occurred while importing data. Check the Zipline logs for more details.',
            color: 'red',
            icon: <IconDatabaseOff size='1rem' />,
            autoClose: 10000,
            id: 'importing-data',
          });
          return;
        } else {
          updateNotification({
            title: 'Data Imported',
            loading: false,
            message: (
              <>
                The data has been successfully imported. If there were any conflicts, they have been logged.{' '}
                <Stack gap={2}>
                  <div>
                    <b>Users: </b> {Object.keys(data?.users ?? {}).length}
                  </div>
                  <div>
                    <b>Folders: </b> {Object.keys(data?.folders ?? {}).length}
                  </div>
                  <div>
                    <b>URLs: </b> {Object.keys(data?.urls ?? {}).length}
                  </div>
                  <div>
                    <b>Files: </b> {Object.keys(data?.files ?? {}).length}{' '}
                  </div>
                </Stack>
              </>
            ),
            color: 'teal',
            icon: <IconDatabaseImport size='1rem' />,
            autoClose: 10000,
            id: 'importing-data',
          });

          if (Object.keys(data?.users ?? {}).length === 0) {
            showNotification({
              title: 'No users imported',
              message:
                'No users were imported, likely because the export contains usernames that already exist in this Zipline instance. Check the Zipline logs for more details. Files, folders, and URLs may also not have been imported.',
              color: 'orange',
              icon: <IconExclamationMark size='1rem' />,
              autoClose: 5000,
            });
          }

          if (Object.keys(data?.files ?? {}).length > 0) {
            modals.open({
              title: 'Are you sure?',
              children: (
                <>
                  <p>
                    {Object.keys(data?.files ?? {}).length} files were imported. Since this import does not
                    copy files, you will need to move the files from the instance where they are stored to the
                    current Zipline instance. The <Code>import-dir</Code> script may be useful for this if
                    using directory storage. If you are using S3, you can use the same bucket for this
                    instance.
                  </p>

                  <Alert
                    mb='xs'
                    color='red'
                    variant='outline'
                    icon={<IconExclamationMark size='1rem' />}
                    title='Important'
                  >
                    After importing, you should either delete the export file or store it securely, as it
                    contains sensitive information such as passwords and OAuth tokens.
                  </Alert>

                  {settingsEnv && (
                    <Alert
                      mb='xs'
                      color='green'
                      variant='outline'
                      icon={<IconExclamationMark size='1rem' />}
                      title='Settings Imported'
                    >
                      Imported settings have been applied, it is advised to reload the page to ensure the
                      settings are applied correctly.
                    </Alert>
                  )}

                  <Button
                    onClick={() => {
                      modals.closeAll();
                    }}
                    color='teal'
                    fullWidth
                    leftSection={<IconCheck size='1rem' />}
                  >
                    Okay
                  </Button>
                </>
              ),
            });
          }
        }

        setFile(null);
        setExport3(null);
      },
    });
  };

  useEffect(() => {
    if (!open) return;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      onContent(content as string);
    };
    reader.readAsText(file);
  }, [file]);

  return (
    <>
      <Modal opened={open} onClose={() => setOpen(false)} title='Import data' size='xl'>
        {export3 ? (
          <Button
            onClick={() => {
              setFile(null);
              setExport3(null);
            }}
            color='red'
            variant='filled'
            aria-label='Clear'
            mb='xs'
            leftSection={<IconX size='1rem' />}
            fullWidth
          >
            Clear Import
          </Button>
        ) : (
          <FileButton onChange={setFile} accept='application/json'>
            {(props) => (
              <>
                <Button
                  {...props}
                  disabled={!!file}
                  mb='xs'
                  leftSection={<IconUpload size='1rem' />}
                  fullWidth
                >
                  Upload Export (JSON)
                </Button>
              </>
            )}
          </FileButton>
        )}

        {file && export3 && (
          <>
            <Export3Details export3={export3} />
            <Export3ImportSettings
              export3={export3}
              importSettings={importSettings}
              setImportSettings={setImportSettings}
            />
            <Export3UserChoose export3={export3} setImportFrom={setImportFrom} importFrom={importFrom} />
          </>
        )}

        {export3 && (
          <Button onClick={handleImport} fullWidth leftSection={<IconDatabaseImport size='1rem' />} mt='xs'>
            Import Data
          </Button>
        )}
      </Modal>

      <Button size='sm' leftSection={<IconDatabaseImport size='1rem' />} onClick={() => setOpen(true)}>
        Import Data
      </Button>
    </>
  );
}
