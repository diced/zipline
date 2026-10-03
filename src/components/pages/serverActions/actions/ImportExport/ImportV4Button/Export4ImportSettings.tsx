import { Export4 } from '@/lib/import/version4/validateExport';
import { Box, Button, Checkbox, Collapse, Group, Paper, Table, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import SafeTrans from '@/components/SafeTrans';

export default function Export4ImportSettings({
  export4,
  setImportSettings,
  importSettings,
}: {
  export4: Export4;
  setImportSettings: (importSettings: boolean) => void;
  importSettings: boolean;
}) {
  const { t } = useTranslation('serverActions');
  const [showSettings, { toggle: toggleSettings }] = useDisclosure(false);

  const filteredSettings = Object.fromEntries(
    Object.entries(export4.data.settings).filter(
      ([key, _value]) => !['createdAt', 'updatedAt', 'id'].includes(key),
    ),
  );

  return (
    <Box my='lg'>
      <Text size='md'>{t('importExport.importSettings.title')}</Text>
      <Text size='sm' c='dimmed'>
        <SafeTrans t={t} i18nKey='importExport.v4.importSettings.description' components={{ br: <br /> }} />
      </Text>

      <Button my='xs' onClick={toggleSettings} size='compact-xs'>
        {showSettings ? t('importExport.v4.importSettings.hide') : t('importExport.v4.importSettings.show')}
      </Button>

      <Collapse expanded={showSettings}>
        <Paper withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={300}>{t('importExport.details.table.key')}</Table.Th>
                <Table.Th>{t('importExport.details.table.value')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Object.entries(filteredSettings).map(([key, value]) => (
                <Table.Tr key={key}>
                  <Table.Td ff='monospace'>{key}</Table.Td>
                  <Table.Td>
                    <Text c='dimmed' fz='xs' ff='monospace'>
                      {JSON.stringify(value)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        <Button my='xs' onClick={toggleSettings} size='compact-xs'>
          {showSettings ? t('importExport.v4.importSettings.hide') : t('importExport.v4.importSettings.show')}
        </Button>
      </Collapse>

      <Checkbox.Card
        checked={importSettings}
        onClick={() => setImportSettings(!importSettings)}
        radius='md'
        my='sm'
      >
        <Group wrap='nowrap' align='flex-start'>
          <Checkbox.Indicator m='md' />
          <Text my='sm'>
            {t('importExport.importSettings.count', { count: Object.keys(filteredSettings).length })}
          </Text>
        </Group>
      </Checkbox.Card>
    </Box>
  );
}
