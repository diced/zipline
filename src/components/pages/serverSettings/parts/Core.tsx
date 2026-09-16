import type { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, Stack, Switch, TagsInput, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
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
          label='Return HTTPS URLs'
          description='Return URLs with HTTPS protocol.'
          {...form.getInputProps('coreReturnHttpsUrls', { type: 'checkbox' })}
        />

        <Switch
          label='Trust Proxies'
          description='Trust X-Forwarded-* headers from the trusted proxies listed below. Requires a server restart.'
          {...form.getInputProps('coreTrustProxy', { type: 'checkbox' })}
        />

        <TagsInput
          label='Trusted Proxies'
          description='Enter the IPv4/IPv6 addresses or CIDRs of your reverse proxies, separated by commas. Only include trusted proxies, not client networks. An empty list ignores forwarded headers and shares rate limits across clients behind the same proxy. Requires a server restart.'
          placeholder='127.0.0.1, ::1'
          {...form.getInputProps('coreTrustedProxies')}
        />

        <TextInput
          label='Default Domain'
          description='The domain to use when generating URLs. This value should not include the protocol.'
          placeholder='example.com'
          {...form.getInputProps('coreDefaultDomain')}
        />

        <TextInput
          label='Temporary Directory'
          description='The directory to store temporary files. If the path is invalid, certain functions may break. Requires a server restart.'
          placeholder='/tmp/zipline'
          {...form.getInputProps('coreTempDirectory')}
        />
      </Stack>

      <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
        Save
      </Button>
    </form>
  );
}
