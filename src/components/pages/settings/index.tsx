import { useConfig } from '@/components/ConfigProvider';
import { Group, SimpleGrid, Title } from '@mantine/core';
import SettingsAvatar from './parts/SettingsAvatar';
import SettingsDashboard from './parts/SettingsDashboard';
import SettingsFileView from './parts/SettingsFileView';
import SettingsGenerators from './parts/SettingsGenerators';
import SettingsMfa from './parts/SettingsMfa';
import SettingsOAuth from './parts/SettingsOAuth';
import SettingsUser from './parts/SettingsUser';

export default function DashboardSettings() {
  const config = useConfig();

  return (
    <>
      <Group spacing='sm'>
        <Title order={1}>Settings</Title>
      </Group>

      <SimpleGrid mt='md' cols={2} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
        <SettingsUser />

        <SettingsDashboard />

        <SettingsAvatar />

        <SettingsFileView />

        {config.features.oauthRegistration && <SettingsOAuth />}
        {config.mfa.totp.enabled && <SettingsMfa />}

        <SettingsGenerators />
      </SimpleGrid>
    </>
  );
}
