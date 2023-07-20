import { useSettingsStore } from '@/lib/store/settings';
import { Paper, Stack, Switch, Text, Title } from '@mantine/core';

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
      </Stack>
    </Paper>
  );
}
