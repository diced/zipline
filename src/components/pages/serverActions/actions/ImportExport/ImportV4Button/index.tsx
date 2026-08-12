import { Response } from '@/lib/api/response';
import { useUserStore } from '@/lib/client/store/user';
import { fetchApi } from '@/lib/fetchApi';
import { Export4, validateExport } from '@/lib/import/version4/validateExport';
import { Button, FileButton, Modal, Pill, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification, updateNotification } from '@mantine/notifications';
import { IconDatabaseImport, IconDatabaseOff, IconUpload, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { mutate } from 'swr';
import Export4Details from './Export4Details';
import Export4ImportSettings from './Export4ImportSettings';
import Export4UserChoose from './Export4UserChoose';
import Export4WarningSameInstance, { detectSameInstance } from './Export4WarningSameInstance';

export default function ImportV4Button() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [export4, setExport4] = useState<Export4 | null>(null);
  const [importSettings, setImportSettings] = useState(true);
  const [sameInstanceAgree, setSameInstanceAgree] = useState(false);
  const [importFrom, setImportFrom] = useState('');

  const currentUserId = useUserStore((state) => state.user?.id);
  const isSameInstance = detectSameInstance(export4, currentUserId);

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
          "Zipline couldn't validate the import data. Are you sure it's a valid export from Zipline v4? For more details about the error, check the browser console.",
        color: 'red',
        icon: <IconDatabaseOff size='1rem' />,
        autoClose: 10000,
      });
      setOpen(false);
      setFile(null);
      return;
    }
    setExport4(validated.data);
  };

  const handleImportSettings = async () => {
    if (!export4) return;

    const { error } = await fetchApi<Response['/api/server/settings']>(
      '/api/server/settings',
      'PATCH',
      export4.data.settings,
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
        title: 'Settings imported',
        message: 'To ensure that all settings take effect, it is recommended to restart Zipline.',
        color: 'green',
      });

      mutate('/api/server/settings');
      mutate('/api/server/settings/web');
      mutate('/api/server/public');
    }
  };

  const handleImport = async () => {
    if (!export4) return;

    if (isSameInstance && !sameInstanceAgree) {
      modals.openContextModal({
        modal: 'alert',
        title: 'Same Instance Detected',
        innerProps: {
          modalBody:
            'Detected that you are importing data from the same instance as the current running one. You must agree to the warning before proceeding with the import.',
        },
      });
      return;
    }

    modals.openConfirmModal({
      title: 'Are you sure?',
      children:
        'This process will NOT overwrite existing data but will append to it. In case of conflicts, the imported data will be skipped and logged.',
      labels: {
        confirm: 'Yes, import data.',
        cancel: 'Cancel',
      },
      onConfirm: async () => {
        showNotification({
          title: 'Importing data...',
          message:
            'The export file will be uploaded. This amy take a few moments. The import is running in the background and is logged, so you can close this browser tab if you want.',
          color: 'blue',
          autoClose: 5000,
          id: 'importing-data',
          loading: true,
        });

        setOpen(false);

        await handleImportSettings();

        const { error, data } = await fetchApi<Response['/api/server/import/v4']>(
          '/api/server/import/v4',
          'POST',
          {
            export4,
            config: {
              settings: importSettings,
              mergeCurrentUser: importFrom === '' ? undefined : importFrom,
            },
          },
        );

        if (error) {
          updateNotification({
            title: 'Failed to import data...',
            message:
              error.error ?? 'An error occurred while importing data. Check the logs for more details.',
            color: 'red',
            icon: <IconDatabaseOff size='1rem' />,
            id: 'importing-data',
            autoClose: 10000,
          });
        } else {
          if (!data) return;

          modals.open({
            title: 'Import Completed.',
            children: (
              <Text size='md'>
                The import has been completed. To make sure files are properly viewable, make sure that you
                have configured the datasource correctly to match your previous instance. For example, if you
                were using local storage before, make sure to set it to the same directory (or same backed up
                directory) as before. If you are using S3, make sure you are using the same bucket. <br />{' '}
                <br />
                Additionally, it is recommended to restart Zipline to ensure all settings take full effect.
                <br /> <br />
                <b>Users: </b>
                {data.imported.users} imported.
                <br />
                <b>OAuth Providers: </b>
                {data.imported.oauthProviders} imported.
                <br />
                <b>Quotas: </b>
                {data.imported.quotas} imported.
                <br />
                <b>Passkeys: </b>
                {data.imported.passkeys} imported.
                <br />
                <b>Folders: </b>
                {data.imported.folders} imported.
                <br />
                <b>Files: </b>
                {data.imported.files} imported.
                <br />
                <b>Tags: </b>
                {data.imported.tags} imported.
                <br />
                <b>URLs: </b>
                {data.imported.urls} imported.
                <br />
                <b>Invites: </b>
                {data.imported.invites} imported.
                <br />
                <b>Metrics: </b>
                {data.imported.metrics} imported.
              </Text>
            ),
          });
        }
      },
    });

    setFile(null);
    setExport4(null);
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
      <Modal opened={open} onClose={() => setOpen(false)} title='Import V4 Data' size='xl'>
        {export4 ? (
          <Button
            onClick={() => {
              setFile(null);
              setExport4(null);
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

        {file && export4 && (
          <>
            <Export4Details export4={export4} />
            <Export4ImportSettings
              export4={export4}
              importSettings={importSettings}
              setImportSettings={setImportSettings}
            />
            <Export4UserChoose export4={export4} importFrom={importFrom} setImportFrom={setImportFrom} />
            <Export4WarningSameInstance
              export4={export4}
              sameInstanceAgree={sameInstanceAgree}
              setSameInstanceAgree={setSameInstanceAgree}
            />
          </>
        )}

        {export4 && (
          <Button onClick={handleImport} fullWidth leftSection={<IconDatabaseImport size='1rem' />} mt='xs'>
            Import Data
          </Button>
        )}
      </Modal>

      <Button size='xl' rightSection={<Pill>V4</Pill>} onClick={() => setOpen(true)}>
        Import
      </Button>
    </>
  );
}
