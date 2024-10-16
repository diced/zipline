import { useThemes } from '@/components/ThemeProvider';
import { useSettingsStore } from '@/lib/store/settings';
import { Group, NumberInput, Paper, Select, Stack, Switch, Text, Title } from '@mantine/core';
import { IconMoonFilled, IconPaintFilled, IconPercentage, IconSunFilled } from '@tabler/icons-react';

const renderThemeOption =
  (themes: ReturnType<typeof useThemes>) =>
  ({ option }: { option: { value: string; label: string } }) => (
    <Group gap='xs'>
      {option.value === 'system' ? (
        <IconPaintFilled size='1rem' />
      ) : themes.find((theme) => theme.id === option.value)?.colorScheme === 'dark' ? (
        <IconMoonFilled size='1rem' />
      ) : (
        <IconSunFilled size='1rem' />
      )}
      {option.label}
    </Group>
  );

export default function SettingsDashboard() {
  const [settings, update] = useSettingsStore((state) => [state.settings, state.update]);
  const themes = useThemes();

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Dashboard Settings</Title>
      <Text size='sm' c='dimmed' mt={3}>
        These settings are saved in your browser.
      </Text>

      <Stack gap='sm' my='xs'>
        <Group grow>
          <Switch
            label='Disable Media Preview'
            description='Disable previews of files in the dashboard. This is useful to save data as Zipline, by default, will load previews of files.'
            checked={settings.disableMediaPreview}
            onChange={(event) => update('disableMediaPreview', event.currentTarget.checked)}
          />
          <Switch
            label='Warn on deletion'
            description='Show a warning when deleting stuff. When this is disabled, files, urls, etc will be deleted with no prior warning! Folders, users, and bulk-transactions are exempt from this rule and will always warn you before deleting anything.'
            checked={settings.warnDeletion}
            onChange={(event) => update('warnDeletion', event.currentTarget.checked)}
          />
        </Group>

        <NumberInput
          label='Search Threshold'
          description='When performing a similarity check on file/url searches, this is the minimum percentage of similarity required to show the file/url. The lower the number, the more results will be shown though they will be less relevant to the actual search query. A recomended value is between 0.1 and 0.4 as this will yield moderate-relevancy results that should match your queries.'
          min={0}
          max={100}
          value={settings.searchThreshold}
          onChange={(value) => update('searchThreshold', value === '' ? 0 : Number(value))}
          step={0.01}
          decimalScale={2}
          leftSection={<IconPercentage size='1rem' />}
        />

        <Select
          label='Theme'
          description='The theme to use for the dashboard. This is only a visual change on your browser and does not change the theme for other users.'
          data={[
            { value: 'system', label: 'System' },
            ...themes.map((theme) => ({ value: theme.id, label: theme.name })),
          ]}
          value={settings.theme}
          onChange={(value) => update('theme', value ?? 'builtin:dark_gray')}
          leftSection={<IconPaintFilled size='1rem' />}
          renderOption={renderThemeOption(themes)}
        />

        {settings.theme === 'system' && (
          <Group grow>
            <Select
              label='Dark Theme'
              description='The theme to use for the dashboard when your system is in dark mode.'
              data={themes
                .filter((theme) => theme.colorScheme === 'dark')
                .map((theme) => ({ value: theme.id, label: theme.name }))}
              value={settings.themeDark}
              onChange={(value) => update('themeDark', value ?? 'builtin:dark_gray')}
              disabled={settings.theme !== 'system'}
              leftSection={<IconMoonFilled size='1rem' />}
            />

            <Select
              label='Light Theme'
              description='The theme to use for the dashboard when your system is in light mode.'
              data={themes
                .filter((theme) => theme.colorScheme === 'light')
                .map((theme) => ({ value: theme.id, label: theme.name }))}
              value={settings.themeLight}
              onChange={(value) => update('themeLight', value ?? 'builtin:light_gray')}
              disabled={settings.theme !== 'system'}
              leftSection={<IconSunFilled size='1rem' />}
            />
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
