import { Alert, Box, Button, List, Modal, Code, Group, Divider, Checkbox, Pill } from '@mantine/core';
import { IconAlertCircle, IconDownload } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SafeTrans from '@/components/SafeTrans';

const EXPORT_ITEMS = [
  'importExport.export.items.users',
  'importExport.export.items.passkeys',
  'importExport.export.items.userQuotas',
  'importExport.export.items.oauthProviders',
  'importExport.export.items.userTags',
  'importExport.export.items.files',
  'importExport.export.items.folders',
  'importExport.export.items.urls',
  'importExport.export.items.thumbnails',
  'importExport.export.items.invites',
  'importExport.export.items.metrics',
] as const;

const EXPORT_SYSTEM_ITEMS = [
  'importExport.export.systemItems.cpuCount',
  'importExport.export.systemItems.hostname',
  'importExport.export.systemItems.architecture',
  'importExport.export.systemItems.platform',
  'importExport.export.systemItems.osRelease',
  'importExport.export.systemItems.env',
  'importExport.export.systemItems.versions',
] as const;

export default function ExportButton() {
  const { t } = useTranslation(['serverActions', 'common']);
  const [open, setOpen] = useState(false);

  const [noMetrics, setNoMetrics] = useState(false);

  return (
    <>
      <Modal opened={open} onClose={() => setOpen(false)} size='lg' title={t('common:warning.title')}>
        <Box px='sm'>
          <p>{t('importExport.export.intro')}</p>

          <List>
            {EXPORT_ITEMS.map((key) => (
              <List.Item key={key}>
                <SafeTrans t={t} i18nKey={key} components={{ b: <b />, i: <i /> }} />
              </List.Item>
            ))}
          </List>

          <p>
            <SafeTrans t={t} i18nKey='importExport.export.systemIntro' components={{ b: <b /> }} />
          </p>

          <List>
            {EXPORT_SYSTEM_ITEMS.map((key) => (
              <List.Item key={key}>
                <SafeTrans t={t} i18nKey={key} components={{ b: <b />, code: <Code /> }} />
              </List.Item>
            ))}
          </List>

          <Divider my='md' />

          <Checkbox
            label={t('importExport.export.excludeMetrics.label')}
            description={t('importExport.export.excludeMetrics.description')}
            checked={noMetrics}
            onChange={() => setNoMetrics((val) => !val)}
          />

          <Divider my='md' />

          <Alert
            color='red'
            icon={<IconAlertCircle size='1rem' />}
            title={t('importExport.export.warning.title')}
            my='md'
          >
            {t('importExport.export.warning.message')}
          </Alert>

          <Group grow my='md'>
            <Button onClick={() => setOpen(false)} color='red'>
              {t('common:actions.cancel')}
            </Button>
            <Button
              component='a'
              href={`/api/server/export${noMetrics ? '?nometrics=true' : ''}`}
              target='_blank'
              rel='noreferrer'
              leftSection={<IconDownload size='1rem' />}
              onClick={() => setOpen(false)}
            >
              {t('importExport.export.download')}
            </Button>
          </Group>
        </Box>
      </Modal>

      <Button
        size='xl'
        fullWidth
        onClick={() => setOpen(true)}
        leftSection={<IconDownload size='1rem' />}
        rightSection={<Pill>V4</Pill>}
      >
        {t('importExport.export.button')}
      </Button>
    </>
  );
}
