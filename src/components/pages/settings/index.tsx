import { useConfig } from '@/components/ConfigProvider';
import { eitherTrue } from '@/lib/primitive';
import { isAdministrator } from '@/lib/role';
import { useUserStore } from '@/lib/store/user';
import { Box, Group, Title } from '@mantine/core';
import SettingsAvatar from './parts/SettingsAvatar';
import SettingsDashboard from './parts/SettingsDashboard';
import SettingsFileView from './parts/SettingsFileView';
import SettingsGenerators from './parts/SettingsGenerators';
import SettingsMfa from './parts/SettingsMfa';
import SettingsOAuth from './parts/SettingsOAuth';
import SettingsServerActions from './parts/SettingsServerUtil';
import SettingsUser from './parts/SettingsUser';
import SettingsExports from './parts/SettingsExports';
import SettingsSessions from './parts/SettingsSessions';

export default function DashboardSettings() {
  const config = useConfig();
  const user = useUserStore((state) => state.user);

  return (
    <>
      <Group gap='sm'>
        <Title order={1}>Settings</Title>
      </Group>

      <Box
        mt='md'
        style={{
          columnCount: 2,
          columnGap: '1.5rem',
          columnFill: 'balance',
          '@media (max-width: 768px)': {
            columnCount: 1,
          },
        }}
      >
        <Box style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
          <SettingsUser />
        </Box>
        
        <Box style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
          <SettingsSessions />
        </Box>

        {config.features.oauthRegistration && (
          <Box style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
            <SettingsOAuth />
          </Box>
        )}
        <Box style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
          <SettingsFileView />
        </Box>

        <Box style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
          <SettingsExports />
        </Box>

        <Box style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
          <SettingsAvatar />
        </Box>


        {eitherTrue(config.mfa.totp.enabled, config.mfa.passkeys) && (
          <Box style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
            <SettingsMfa />
          </Box>
        )}

        <Box style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
          <SettingsGenerators />
        </Box>

        <Box style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
          <SettingsDashboard />
        </Box>

        {isAdministrator(user?.role) && (
          <Box style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
            <SettingsServerActions />
          </Box>
        )}
      </Box>
    </>
  );
}
