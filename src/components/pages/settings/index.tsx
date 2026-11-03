import { useConfig } from '@/components/ConfigProvider';
import { eitherTrue } from '@/lib/primitive';
import { Box, Center, Loader, Stack, Tabs, Title } from '@mantine/core';
import { IconAdjustments, IconDownload, IconPhoto, IconShieldLock, IconUser } from '@tabler/icons-react';
import { parseAsString, useQueryState } from 'nuqs';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

const SettingsAvatar = lazy(() => import('./parts/SettingsAvatar'));
const SettingsDashboard = lazy(() => import('./parts/SettingsDashboard'));
const SettingsQuickLinks = lazy(() => import('./parts/SettingsQuickLinks'));
const SettingsFileView = lazy(() => import('./parts/SettingsFileView'));
const SettingsGenerators = lazy(() => import('./parts/SettingsGenerators'));
const SettingsMfa = lazy(() => import('./parts/SettingsMfa'));
const SettingsUser = lazy(() => import('./parts/SettingsUser'));
const SettingsExports = lazy(() => import('./parts/SettingsExports'));
const SettingsSessions = lazy(() => import('./parts/SettingsSessions'));
const SettingsOAuth = lazy(() => import('./parts/SettingsOAuth'));

const DASHBOARD_SETTINGS_TABS = [
  { value: 'account', Icon: IconUser },
  { value: 'dashboard', Icon: IconAdjustments },
  { value: 'fileView', Icon: IconPhoto },
  { value: 'security', Icon: IconShieldLock },
  { value: 'tools', Icon: IconDownload },
] as const;

export default function DashboardSettings() {
  const config = useConfig();
  const { t } = useTranslation('settings');

  const [currTab, setCurrTab] = useQueryState(
    'tab',
    parseAsString.withDefault(DASHBOARD_SETTINGS_TABS[0].value),
  );

  return (
    <>
      <Title order={1}>{t('title')}</Title>

      <Tabs
        defaultValue='account'
        orientation='horizontal'
        variant='pills'
        mt='md'
        value={currTab}
        onChange={setCurrTab}
      >
        <Tabs.List aria-label={t('title')}>
          {DASHBOARD_SETTINGS_TABS.map(({ value, Icon }) => (
            <Tabs.Tab key={value} value={value} leftSection={<Icon size='1rem' aria-hidden />}>
              {t(`tabs.${value}`)}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Box mt='md' miw={0}>
          <Suspense
            fallback={
              <Center mih={200}>
                <Loader size='sm' />
              </Center>
            }
          >
            <Tabs.Panel value='account'>
              <Stack gap='md'>
                <SettingsUser />
                <SettingsAvatar />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value='dashboard'>
              <Stack gap='md'>
                <SettingsDashboard />
                <SettingsQuickLinks />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value='fileView'>
              <SettingsFileView />
            </Tabs.Panel>

            <Tabs.Panel value='security'>
              <Stack gap='md'>
                {eitherTrue(config.mfa.totp.enabled, config.mfa.passkeys.enabled) && <SettingsMfa />}
                <SettingsSessions />
                {eitherTrue(
                  config.oauthEnabled.discord,
                  config.oauthEnabled.github,
                  config.oauthEnabled.google,
                  config.oauthEnabled.oidc,
                ) && <SettingsOAuth />}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value='tools'>
              <Stack gap='md'>
                <SettingsGenerators />
                <SettingsExports />
              </Stack>
            </Tabs.Panel>
          </Suspense>
        </Box>
      </Tabs>
    </>
  );
}
