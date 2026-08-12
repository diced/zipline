import { Export4 } from '@/lib/import/version4/validateExport';
import { Box, Button, Checkbox, Collapse, Group, Paper, Table, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

export default function Export4ImportSettings({
  export4,
  setImportSettings,
  importSettings,
}: {
  export4: Export4;
  setImportSettings: (importSettings: boolean) => void;
  importSettings: boolean;
}) {
  const [showSettings, { toggle: toggleSettings }] = useDisclosure(false);

  const filteredSettings = Object.fromEntries(
    Object.entries(export4.data.settings).filter(
      ([key, _value]) => !['createdAt', 'updatedAt', 'id'].includes(key),
    ),
  );

  return (
    <Box my='lg'>
      <Text size='md'>Import settings?</Text>
      <Text size='sm' c='dimmed'>
        Import all settings from your previous instance into this v4 instance.
        <br />
        After importing, it is recommended to restart Zipline for all settings to take full effect.
      </Text>

      <Button my='xs' onClick={toggleSettings} size='compact-xs'>
        {showSettings ? 'Hide' : 'Show'} Settings to be Imported
      </Button>

      <Collapse expanded={showSettings}>
        <Paper withBorder>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={300}>Key</Table.Th>
                <Table.Th>Value</Table.Th>
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
          {showSettings ? 'Hide' : 'Show'} Settings to be Imported
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
          <Text my='sm'>Import {Object.keys(filteredSettings).length} settings</Text>
        </Group>
      </Checkbox.Card>
    </Box>
  );
}
