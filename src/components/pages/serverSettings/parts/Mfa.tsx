import type { Response } from '@/lib/api/response';
import { Button, Divider, LoadingOverlay, Stack, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function Mfa() {
  const { data, isLoading } = useServerSettings();

  return (
    <>
      <LoadingOverlay visible={isLoading} />
      {data ? <Form data={data} isLoading={isLoading} /> : null}
    </>
  );
}

function Form({ data, isLoading }: { data: Response['/api/server/settings']; isLoading: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation(['serverSettings', 'common']);

  const form = useForm({
    initialValues: {
      mfaTotpEnabled: data.settings.mfaTotpEnabled,
      mfaTotpIssuer: data.settings.mfaTotpIssuer,
      mfaPasskeysEnabled: data.settings.mfaPasskeysEnabled,
      mfaPasskeysRpID: data.settings.mfaPasskeysRpID,
      mfaPasskeysOrigin: data.settings.mfaPasskeysOrigin,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data.tampered.includes(payload.field) || false,
    }),
  });

  const onSubmit = settingsOnSubmit(navigate, form);

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap='lg'>
        <Switch
          label={t('mfa.passkeysEnabled.label')}
          description={t('mfa.passkeysEnabled.description')}
          {...form.getInputProps('mfaPasskeysEnabled', { type: 'checkbox' })}
        />

        <TextInput
          label={t('mfa.passkeysRpId.label')}
          description={t('mfa.passkeysRpId.description')}
          placeholder='example.com'
          {...form.getInputProps('mfaPasskeysRpID')}
        />

        <TextInput
          label={t('mfa.passkeysOrigin.label')}
          description={t('mfa.passkeysOrigin.description')}
          placeholder='https://example.com'
          {...form.getInputProps('mfaPasskeysOrigin')}
        />

        <Divider />

        <Switch
          label={t('mfa.totpEnabled.label')}
          description={t('mfa.totpEnabled.description')}
          {...form.getInputProps('mfaTotpEnabled', { type: 'checkbox' })}
        />
        <TextInput
          label={t('mfa.totpIssuer.label')}
          description={t('mfa.totpIssuer.description')}
          placeholder='Zipline'
          {...form.getInputProps('mfaTotpIssuer')}
        />
      </Stack>

      <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
