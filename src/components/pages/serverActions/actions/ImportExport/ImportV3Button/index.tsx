import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import {
  Export3,
  V3_COMPATIBLE_SETTINGS,
  V3_SETTINGS_TRANSFORM,
  validateExport,
} from '@/lib/import/version3/validateExport';
import { Alert, Button, Code, FileButton, Modal, Pill, Stack } from '@mantine/core';
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
import { Trans, useTranslation } from 'react-i18next';
import Export3Details from './Export3Details';
import Export3ImportSettings from './Export3ImportSettings';
import Export3UserChoose from './Export3UserChoose';

export default function ImportV3Button() {
  const { t } = useTranslation(['serverActions', 'common']);
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
        title: t('importExport.notifications.invalid.title'),
        message: t('importExport.v3.invalidMessage'),
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
        title: t('importExport.notifications.settingsFailed.title'),
        message: error.issues
          ? error.issues.map((x: { message: string }) => x.message).join('\n')
          : error.error,
        color: 'red',
      });
    } else {
      showNotification({
        message: t('importExport.notifications.settingsImported.title'),
        color: 'green',
        icon: <IconDeviceFloppy size='1rem' />,
      });
    }
  };

  const handleImport = async () => {
    modals.openConfirmModal({
      title: t('common:warning.title'),
      children: t('importExport.v3.confirm.message'),
      labels: {
        cancel: t('common:actions.cancel'),
        confirm: t('importExport.importData'),
      },
      onConfirm: async () => {
        showNotification({
          title: t('importExport.v3.importing.title'),
          message: t('importExport.v3.importing.message'),
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
            title: t('importExport.v3.failed.title'),
            message: error.error ?? t('importExport.v3.failed.message'),
            color: 'red',
            icon: <IconDatabaseOff size='1rem' />,
            autoClose: 10000,
            id: 'importing-data',
          });
          return;
        } else {
          updateNotification({
            title: t('importExport.v3.imported.title'),
            loading: false,
            message: (
              <>
                {t('importExport.v3.imported.message')}{' '}
                <Stack gap={2}>
                  <div>
                    <Trans
                      t={t}
                      i18nKey='importExport.v3.imported.stats.users'
                      values={{ count: Object.keys(data?.users ?? {}).length }}
                      components={{ b: <b /> }}
                    />
                  </div>
                  <div>
                    <Trans
                      t={t}
                      i18nKey='importExport.v3.imported.stats.folders'
                      values={{ count: Object.keys(data?.folders ?? {}).length }}
                      components={{ b: <b /> }}
                    />
                  </div>
                  <div>
                    <Trans
                      t={t}
                      i18nKey='importExport.v3.imported.stats.urls'
                      values={{ count: Object.keys(data?.urls ?? {}).length }}
                      components={{ b: <b /> }}
                    />
                  </div>
                  <div>
                    <Trans
                      t={t}
                      i18nKey='importExport.v3.imported.stats.files'
                      values={{ count: Object.keys(data?.files ?? {}).length }}
                      components={{ b: <b /> }}
                    />{' '}
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
              title: t('importExport.v3.noUsers.title'),
              message: t('importExport.v3.noUsers.message'),
              color: 'orange',
              icon: <IconExclamationMark size='1rem' />,
              autoClose: 5000,
            });
          }

          if (Object.keys(data?.files ?? {}).length > 0) {
            modals.open({
              title: t('common:warning.title'),
              children: (
                <>
                  <p>
                    <Trans
                      t={t}
                      i18nKey='importExport.v3.filesImported.message'
                      values={{ count: Object.keys(data?.files ?? {}).length }}
                      components={{ code: <Code /> }}
                    />
                  </p>

                  <Alert
                    mb='xs'
                    color='red'
                    variant='outline'
                    icon={<IconExclamationMark size='1rem' />}
                    title={t('importExport.v3.filesImported.important.title')}
                  >
                    {t('importExport.v3.filesImported.important.message')}
                  </Alert>

                  {settingsEnv && (
                    <Alert
                      mb='xs'
                      color='green'
                      variant='outline'
                      icon={<IconExclamationMark size='1rem' />}
                      title={t('importExport.v3.filesImported.settings.title')}
                    >
                      {t('importExport.v3.filesImported.settings.message')}
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
                    {t('importExport.v3.filesImported.okay')}
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
      <Modal opened={open} onClose={() => setOpen(false)} title={t('importExport.v3.title')} size='xl'>
        {export3 ? (
          <Button
            onClick={() => {
              setFile(null);
              setExport3(null);
            }}
            color='red'
            variant='filled'
            aria-label={t('importExport.clearAriaLabel')}
            mb='xs'
            leftSection={<IconX size='1rem' />}
            fullWidth
          >
            {t('importExport.clear')}
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
                  {t('importExport.upload')}
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
            {t('importExport.importData')}
          </Button>
        )}
      </Modal>

      <Button size='xl' rightSection={<Pill>V3</Pill>} onClick={() => setOpen(true)}>
        {t('importExport.import')}{' '}
      </Button>
    </>
  );
}
