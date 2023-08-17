import { Group, Paper, Text, Title } from '@mantine/core';
import PasskeyButton from '../mfa/PasskeyButton';
import TwoFAButton from '../mfa/TwoFAButton';
import { useConfig } from '@/components/ConfigProvider';

export default function SettingsMfa() {
  const config = useConfig();

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Multi-Factor Authentication</Title>
      <Text size='sm' color='dimmed' mt={3}>
        Setup 2FA or passkeys to add an extra layer of security to your account.
      </Text>

      <Group mt='xs'>
        {config.mfa.totp.enabled && <TwoFAButton />}
        {config.mfa.passkeys && <PasskeyButton />}
      </Group>
    </Paper>
  );
}
