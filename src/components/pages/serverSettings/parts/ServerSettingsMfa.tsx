import { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, Paper, SimpleGrid, Switch, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function ServerSettingsMfa({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      mfaTotpEnabled: false,
      mfaTotpIssuer: 'Zipline',
      mfaPasskeys: false,
    },
  });

  const onSubmit = settingsOnSubmit(router, form);

  useEffect(() => {
    if (!data) return;

    form.setValues({
      mfaTotpEnabled: data?.mfaTotpEnabled ?? false,
      mfaTotpIssuer: data?.mfaTotpIssuer ?? 'Zipline',
      mfaPasskeys: data?.mfaPasskeys,
    });
  }, [data]);

  return (
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>Multi-Factor Authentication</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <Switch
            label='Passkeys'
            description='Enable the use of passwordless login with the use of WebAuthn passkeys like your phone, security keys, etc.'
            {...form.getInputProps('mfaPasskeys', { type: 'checkbox' })}
          />

          <Switch
            label='Enable TOTP'
            description='Enable Time-based One-Time Passwords with the use of an authenticator app.'
            {...form.getInputProps('mfaTotpEnabled', { type: 'checkbox' })}
          />
          <TextInput
            label='Issuer'
            description='The issuer to use for the TOTP token.'
            placeholder='Zipline'
            {...form.getInputProps('mfaTotpIssuer')}
          />
        </SimpleGrid>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
