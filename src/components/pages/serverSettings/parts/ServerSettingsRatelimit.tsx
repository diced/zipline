import { Response } from '@/lib/api/response';
import { Button, NumberInput, Paper, SimpleGrid, Switch, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function ServerSettingsRatelimit({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm<{
    ratelimitEnabled: boolean;
    ratelimitMax: number;
    ratelimitWindow: number | '';
    ratelimitAdminBypass: boolean;
    ratelimitAllowList: string;
  }>({
    initialValues: {
      ratelimitEnabled: true,
      ratelimitMax: 10,
      ratelimitWindow: '',
      ratelimitAdminBypass: false,
      ratelimitAllowList: '',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    if (values.ratelimitAllowList?.trim() === '' || !values.ratelimitAllowList) {
      // @ts-ignore
      values.ratelimitAllowList = [];
    } else {
      // @ts-ignore
      values.ratelimitAllowList = values.ratelimitAllowList
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x !== '');
    }

    if (values.ratelimitWindow === '') {
      // @ts-ignore
      values.ratelimitWindow = null;
    }

    return settingsOnSubmit(router, form)(values);
  };

  useEffect(() => {
    if (!data) return;

    form.setValues({
      ratelimitEnabled: data?.ratelimitEnabled ?? true,
      ratelimitMax: data?.ratelimitMax ?? 10,
      ratelimitWindow: data?.ratelimitWindow ?? '',
      ratelimitAdminBypass: data?.ratelimitAdminBypass ?? false,
      ratelimitAllowList: data?.ratelimitAllowList.join(', ') ?? '',
    });
  }, [data]);

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Ratelimit</Title>

      <Text c='dimmed' size='sm'>
        All options require a restart to take effect.
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <Switch
            label='Enable Ratelimit'
            description='Enable ratelimiting for the server.'
            {...form.getInputProps('ratelimitEnabled', { type: 'checkbox' })}
          />

          <Switch
            label='Admin Bypass'
            description='Allow admins to bypass the ratelimit.'
            disabled={!form.values.ratelimitEnabled}
            {...form.getInputProps('ratelimitAdminBypass', { type: 'checkbox' })}
          />

          <NumberInput
            label='Max Requests'
            description='The maximum number of requests allowed within the window. If no window is set, this is the maximum number of requests until it reaches the limit.'
            placeholder='10'
            min={1}
            disabled={!form.values.ratelimitEnabled}
            {...form.getInputProps('ratelimitMax')}
          />

          <NumberInput
            label='Window'
            description='The window in seconds to allow the max requests.'
            placeholder='60'
            min={1}
            disabled={!form.values.ratelimitEnabled}
            {...form.getInputProps('ratelimitWindow')}
          />

          <TextInput
            label='Allow List'
            description='A comma-separated list of IP addresses to bypass the ratelimit.'
            placeholder='1.1.1.1, 8.8.8.8'
            disabled={!form.values.ratelimitEnabled}
            {...form.getInputProps('ratelimitAllowList')}
          />
        </SimpleGrid>

        <Button
          type='submit'
          color='blue'
          mt='md'
          loading={isLoading}
          leftSection={<IconDeviceFloppy size='1rem' />}
        >
          Save
        </Button>
      </form>
    </Paper>
  );
}
