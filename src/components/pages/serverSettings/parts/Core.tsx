import type { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, Stack, Switch, TagsInput, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function Core() {
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
      coreReturnHttpsUrls: data.settings.coreReturnHttpsUrls,
      coreDefaultDomain: data.settings.coreDefaultDomain,
      coreTempDirectory: data.settings.coreTempDirectory,
      coreTrustProxy: data.settings.coreTrustProxy,
      coreTrustedProxies: data.settings.coreTrustedProxies,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data.tampered.includes(payload.field) || false,
    }),
  });

  const onSubmit = async (values: typeof form.values) => {
    if (values.coreDefaultDomain?.trim() === '' || !values.coreDefaultDomain) {
      values.coreDefaultDomain = null;
    } else {
      values.coreDefaultDomain = values.coreDefaultDomain.trim();
    }

    return settingsOnSubmit(navigate, form)(values);
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap='lg'>
        <Switch
          mt='md'
          label={t('core.returnHttpsUrls.label')}
          description={t('core.returnHttpsUrls.description')}
          {...form.getInputProps('coreReturnHttpsUrls', { type: 'checkbox' })}
        />

        <Switch
          label={t('core.trustProxy.label')}
          description={t('core.trustProxy.description')}
          {...form.getInputProps('coreTrustProxy', { type: 'checkbox' })}
        />

        <TagsInput
          label={t('core.trustedProxies.label')}
          description={t('core.trustedProxies.description')}
          placeholder='127.0.0.1, ::1'
          {...form.getInputProps('coreTrustedProxies')}
        />

        <TextInput
          label={t('core.defaultDomain.label')}
          description={t('core.defaultDomain.description')}
          placeholder='example.com'
          {...form.getInputProps('coreDefaultDomain')}
        />

        <TextInput
          label={t('core.tempDirectory.label')}
          description={t('core.tempDirectory.description')}
          placeholder='/tmp/zipline'
          {...form.getInputProps('coreTempDirectory')}
        />
      </Stack>

      <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
