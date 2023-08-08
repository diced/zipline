import { useSettingsStore } from '@/lib/store/settings';
import { NumberInput, Paper, Stack, Switch, Text, Title } from '@mantine/core';

export default function SettingsDashboard() {
  const [settings, update] = useSettingsStore((state) => [state.settings, state.update]);

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Dashboard Settings</Title>
      <Text size='sm' color='dimmed' mt={3}>
        These settings are saved in your browser.
      </Text>

      <Stack spacing='sm' my='xs'>
        <Switch
          label='Disable Media Preview'
          description='Disable previews of files in the dashboard. This is useful to save data as Zipline, by default, will load previews of files.'
          checked={settings.disableMediaPreview}
          onChange={(event) => update('disableMediaPreview', event.currentTarget.checked)}
        />
        <Switch
          label='Warn on deletion'
          description='Show a warning when deleting files. This is useful to prevent accidental deletion of files.'
          checked={settings.warnDeletion}
          onChange={(event) => update('warnDeletion', event.currentTarget.checked)}
        />

        <NumberInput
          label='Search Treshold'
          description='When performing a similarity check on file searches, this is the minimum percentage of similarity required to show the file. The lower the number, the more results will be shown though they will be less relevant to the actual search query. A recomended value is between 0.1 and 0.4 as this will yield moderate-relevancy results that should match your queries.'
          min={0}
          max={100}
          value={settings.searchTreshold}
          onChange={(value) => update('searchTreshold', value === '' ? 0 : value)}
          step={0.01}
          precision={2}
        />
      </Stack>
    </Paper>
  );
}
