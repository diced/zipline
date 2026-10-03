import DomainSelect from '@/components/DomainSelect';
import { useThemes } from '@/components/ThemeProvider';
import { useSettingsStore } from '@/lib/client/store/settings';
import { Group, Paper, Select, Stack, Switch, Text, Title } from '@mantine/core';
import { IconMoonFilled, IconPaintFilled, IconSunFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import SafeTrans from '@/components/SafeTrans';
import { useShallow } from 'zustand/shallow';

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
  const [settings, update] = useSettingsStore(useShallow((state) => [state.settings, state.update]));
  const themes = useThemes();
  const { t } = useTranslation('settings');

  const sortedThemes = themes.sort((a, b) => {
    if (a.colorScheme === 'light' && b.colorScheme === 'dark') return -1;
    if (a.colorScheme === 'dark' && b.colorScheme === 'light') return 1;
    return 0;
  });

  return (
    <Paper withBorder p='sm' h='100%'>
      <Title order={2}>{t('dashboard.title')}</Title>
      <Text size='sm' c='dimmed' mt={3}>
        <SafeTrans t={t} i18nKey='dashboard.description' components={{ b: <b /> }} />
      </Text>

      <Stack gap='sm' my='xs'>
        <Stack>
          <Switch
            label={t('dashboard.disableMediaPreview.label')}
            description={t('dashboard.disableMediaPreview.description')}
            checked={settings.disableMediaPreview}
            onChange={(event) => update('disableMediaPreview', event.currentTarget.checked)}
          />
          <Switch
            label={t('dashboard.mediaAutoMuted.label')}
            description={t('dashboard.mediaAutoMuted.description')}
            checked={settings.mediaAutoMuted}
            onChange={(event) => update('mediaAutoMuted', event.currentTarget.checked)}
          />
          <Switch
            label={t('dashboard.warnDeletion.label')}
            description={t('dashboard.warnDeletion.description')}
            checked={settings.warnDeletion}
            onChange={(event) => update('warnDeletion', event.currentTarget.checked)}
          />
          <Switch
            label={t('dashboard.fileNavButtons.label')}
            description={t('dashboard.fileNavButtons.description')}
            checked={settings.fileNavButtons}
            onChange={(event) => update('fileNavButtons', event.currentTarget.checked)}
          />
          <Switch
            label={t('dashboard.homeShowRecents.label')}
            description={t('dashboard.homeShowRecents.description')}
            checked={settings.homeShowRecents}
            onChange={(event) => update('homeShowRecents', event.currentTarget.checked)}
          />

          <Switch
            label={t('dashboard.homeShowActivity.label')}
            description={t('dashboard.homeShowActivity.description')}
            checked={settings.homeShowActivity}
            onChange={(event) => update('homeShowActivity', event.currentTarget.checked)}
          />

          <Switch
            label={t('dashboard.homeShowTypes.label')}
            description={t('dashboard.homeShowTypes.description')}
            checked={settings.homeShowTypes}
            onChange={(event) => update('homeShowTypes', event.currentTarget.checked)}
          />
        </Stack>

        <Select
          label={t('dashboard.fileViewer.label')}
          description={t('dashboard.fileViewer.description')}
          data={[
            { value: 'fullscreen', label: t('dashboard.fileViewer.options.fullscreen') },
            { value: 'default', label: t('dashboard.fileViewer.options.default') },
          ]}
          value={settings.fileViewer}
          onChange={(value) => update('fileViewer', (value as 'default' | 'fullscreen') ?? 'fullscreen')}
        />

        <DomainSelect
          label={t('dashboard.domain.label')}
          description={t('dashboard.domain.description')}
          value={settings.domain}
          onChange={(value) => update('domain', (value as string) ?? '')}
        />

        <Select
          label={t('dashboard.theme.label')}
          description={t('dashboard.theme.description')}
          data={[
            { value: 'system', label: t('dashboard.theme.system') },
            ...sortedThemes.map((theme) => ({ value: theme.id, label: theme.name })),
          ]}
          value={settings.theme}
          onChange={(value) => update('theme', value ?? 'builtin:dark_gray')}
          leftSection={<IconPaintFilled size='1rem' />}
          renderOption={renderThemeOption(themes)}
        />

        {settings.theme === 'system' && (
          <Group grow>
            <Select
              label={t('dashboard.themeDark.label')}
              description={t('dashboard.themeDark.description')}
              data={themes
                .filter((theme) => theme.colorScheme === 'dark')
                .map((theme) => ({ value: theme.id, label: theme.name }))}
              value={settings.themeDark}
              onChange={(value) => update('themeDark', value ?? 'builtin:dark_gray')}
              disabled={settings.theme !== 'system'}
              leftSection={<IconMoonFilled size='1rem' />}
            />

            <Select
              label={t('dashboard.themeLight.label')}
              description={t('dashboard.themeLight.description')}
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
