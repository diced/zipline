import { Export3, V3_COMPATIBLE_SETTINGS } from '@/lib/import/version3/validateExport';
import { Box, Checkbox, Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export default function Export3ImportSettings({
  export3,
  setImportSettings,
  importSettings,
}: {
  export3: Export3;
  setImportSettings: (importSettings: boolean) => void;
  importSettings: boolean;
}) {
  const { t } = useTranslation('serverActions');
  const commonSettings = Object.keys(V3_COMPATIBLE_SETTINGS).filter((key) => key in export3.request.env);

  return (
    <Box my='lg'>
      <Text size='md'>{t('importExport.importSettings.title')}</Text>
      <Text size='sm' c='dimmed'>
        {t('importExport.v3.importSettings.description')}
      </Text>

      <Checkbox.Card
        checked={importSettings}
        onClick={() => setImportSettings(!importSettings)}
        radius='md'
        my='sm'
      >
        <Group wrap='nowrap' align='flex-start'>
          <Checkbox.Indicator m='md' />
          <Text my='sm'>{t('importExport.importSettings.count', { count: commonSettings.length })}</Text>
        </Group>
      </Checkbox.Card>
    </Box>
  );
}
