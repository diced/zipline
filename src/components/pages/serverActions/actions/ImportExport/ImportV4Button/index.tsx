import { Response } from '@/lib/api/response';
import { useUserStore } from '@/lib/client/store/user';
import { fetchApi } from '@/lib/fetchApi';
import { Export4, validateExport } from '@/lib/import/version4/validateExport';
import { Button, FileButton, Modal, Pill, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { showNotification, updateNotification } from '@mantine/notifications';
import { IconDatabaseImport, IconDatabaseOff, IconUpload, IconX } from '@tabler/icons-react';
import { Fragment, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import Export4Details from './Export4Details';
import Export4ImportSettings from './Export4ImportSettings';
import Export4UserChoose from './Export4UserChoose';
import Export4WarningSameInstance, { detectSameInstance } from './Export4WarningSameInstance';

const IMPORTED_STATS = [
  ['importExport.v4.completed.stats.users', 'users'],
  ['importExport.v4.completed.stats.oauthProviders', 'oauthProviders'],
  ['importExport.v4.completed.stats.quotas', 'quotas'],
  ['importExport.v4.completed.stats.passkeys', 'passkeys'],
  ['importExport.v4.completed.stats.folders', 'folders'],
  ['importExport.v4.completed.stats.files', 'files'],
  ['importExport.v4.completed.stats.tags', 'tags'],
  ['importExport.v4.completed.stats.urls', 'urls'],
  ['importExport.v4.completed.stats.invites', 'invites'],
  ['importExport.v4.completed.stats.metrics', 'metrics'],
] as const;

export default function ImportV4Button() {
  const { t } = useTranslation(['serverActions', 'common']);
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
        title: t('importExport.notifications.invalid.title'),
        message: t('importExport.v4.invalidMessage'),
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
        title: t('importExport.notifications.settingsFailed.title'),
        message: error.issues
          ? error.issues.map((x: { message: string }) => x.message).join('\n')
          : error.error,
        color: 'red',
      });
    } else {
      showNotification({
        title: t('importExport.notifications.settingsImported.title'),
        message: t('importExport.v4.settingsImportedMessage'),
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
        title: t('importExport.v4.sameInstance.title'),
        innerProps: {
          modalBody: t('importExport.v4.sameInstance.modalBody'),
        },
      });
      return;
    }

    modals.openConfirmModal({
      title: t('common:warning.title'),
      children: t('importExport.v4.confirm.message'),
      labels: {
        confirm: t('importExport.v4.confirm.label'),
        cancel: t('common:actions.cancel'),
      },
      onConfirm: async () => {
        showNotification({
          title: t('importExport.v4.importing.title'),
          message: t('importExport.v4.importing.message'),
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
            title: t('importExport.v4.failed.title'),
            message: error.error ?? t('importExport.v4.failed.message'),
            color: 'red',
            icon: <IconDatabaseOff size='1rem' />,
            id: 'importing-data',
            autoClose: 10000,
          });
        } else {
          if (!data) return;

          modals.open({
            title: t('importExport.v4.completed.title'),
            children: (
              <Text size='md'>
                <Trans t={t} i18nKey='importExport.v4.completed.message' components={{ br: <br /> }} />
                <br /> <br />
                {IMPORTED_STATS.map(([key, stat], i) => (
                  <Fragment key={key}>
                    {i > 0 && <br />}
                    <Trans
                      t={t}
                      i18nKey={key}
                      values={{ count: data.imported[stat] }}
                      components={{ b: <b /> }}
                    />
                  </Fragment>
                ))}
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
      <Modal opened={open} onClose={() => setOpen(false)} title={t('importExport.v4.title')} size='xl'>
        {export4 ? (
          <Button
            onClick={() => {
              setFile(null);
              setExport4(null);
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
            {t('importExport.importData')}
          </Button>
        )}
      </Modal>

      <Button size='xl' rightSection={<Pill>V4</Pill>} onClick={() => setOpen(true)}>
        {t('importExport.import')}
      </Button>
    </>
  );
}
