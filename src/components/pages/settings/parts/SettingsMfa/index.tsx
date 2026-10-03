import { Group, Paper, Text, Title } from '@mantine/core';
import PasskeyButton from './PasskeyButton';
import TwoFAButton from './TwoFAButton';
import { useConfig } from '@/components/ConfigProvider';
import { useTranslation } from 'react-i18next';

export default function SettingsMfa() {
  const config = useConfig();
  const { t } = useTranslation('settings');

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>{t('mfa.title')}</Title>
      <Text size='sm' c='dimmed' mt={3}>
        {t('mfa.description')}
      </Text>

      <Group mt='xs'>
        {config.mfa.totp.enabled && <TwoFAButton />}
        {config.mfa.passkeys.enabled && <PasskeyButton />}
      </Group>
    </Paper>
  );
}
