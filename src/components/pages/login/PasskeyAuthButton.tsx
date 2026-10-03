import { Button } from '@mantine/core';
import { IconKey } from '@tabler/icons-react';
import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { fetchApi } from '@/lib/fetchApi';
import { notifications } from '@mantine/notifications';
import { getWebClient } from '@/lib/api/detect';
import { useTranslation } from 'react-i18next';

export default function PasskeyAuthButton({ onAuthSuccess }: { onAuthSuccess: (data: any) => void }) {
  const { t } = useTranslation('auth');
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data: options } = await fetchApi<any>('/api/auth/webauthn/options', 'GET');
      const res = await startAuthentication({ optionsJSON: options.options });

      const { data, error } = await fetchApi<any>(
        '/api/auth/webauthn',
        'POST',
        { response: res },
        { 'x-zipline-client': JSON.stringify(getWebClient()) },
      );

      if (error) throw new Error(error.error);
      onAuthSuccess(data);
    } catch (e: any) {
      setErrored(true);
      setTimeout(() => setErrored(false), 3000);
      notifications.show({ title: t('passkey.failed'), message: e.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogin}
      size='md'
      fullWidth
      variant='outline'
      leftSection={<IconKey size='1rem' />}
      color={errored ? 'red' : undefined}
      loading={loading}
    >
      {t('passkey.button')}
    </Button>
  );
}
