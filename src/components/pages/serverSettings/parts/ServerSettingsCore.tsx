import { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, Paper, SimpleGrid, Switch, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function ServerSettingsCore({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm<{
    coreReturnHttpsUrls: boolean;
    coreDefaultDomain: string | null | undefined;
    coreTempDirectory: string;
  }>({
    initialValues: {
      coreReturnHttpsUrls: false,
      coreDefaultDomain: null,
      coreTempDirectory: '/tmp/zipline',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    if (values.coreDefaultDomain?.trim() === '' || !values.coreDefaultDomain) {
      values.coreDefaultDomain = null;
    } else {
      values.coreDefaultDomain = values.coreDefaultDomain.trim();
    }

    return settingsOnSubmit(router, form)(values);
  };

  useEffect(() => {
    form.setValues({
      coreReturnHttpsUrls: data?.coreReturnHttpsUrls ?? false,
      coreDefaultDomain: data?.coreDefaultDomain ?? null,
      coreTempDirectory: data?.coreTempDirectory ?? '/tmp/zipline',
    });
  }, [data]);

  return (
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>Core</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Switch
          mt='md'
          label='Return HTTPS URLs'
          description='Return URLs with HTTPS protocol.'
          {...form.getInputProps('coreReturnHttpsUrls', { type: 'checkbox' })}
        />

        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <TextInput
            label='Default Domain'
            description='The domain to use when generating URLs.'
            placeholder='https://example.com'
            {...form.getInputProps('coreDefaultDomain')}
          />

          <TextInput
            label='Temporary Directory'
            description='The directory to store temporary files. If the path is invalid, certain functions may break. Requires a server restart.'
            placeholder='/tmp/zipline'
            {...form.getInputProps('coreTempDirectory')}
          />
        </SimpleGrid>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
