import { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, Paper, SimpleGrid, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import ms from 'ms';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function ServerSettingsTasks({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      tasksDeleteInterval: ms(1800000),
      tasksClearInvitesInterval: ms(1800000),
      tasksMaxViewsInterval: ms(1800000),
      tasksThumbnailsInterval: ms(1800000),
      tasksMetricsInterval: ms(1800000),
    },
  });

  const onSubmit = settingsOnSubmit(router, form);

  useEffect(() => {
    if (!data) return;

    form.setValues({
      tasksDeleteInterval: ms(data?.tasksDeleteInterval ?? 1800000),
      tasksClearInvitesInterval: ms(data?.tasksClearInvitesInterval ?? 1800000),
      tasksMaxViewsInterval: ms(data?.tasksMaxViewsInterval ?? 1800000),
      tasksThumbnailsInterval: ms(data?.tasksThumbnailsInterval ?? 1800000),
      tasksMetricsInterval: ms(data?.tasksMetricsInterval ?? 1800000),
    });
  }, [data]);

  return (
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>Tasks</Title>

      <Text c='dimmed' size='sm'>
        All options require a restart to take effect.
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <TextInput
            label='Delete Files Interval'
            description='How often to check and delete expired files.'
            placeholder='30m'
            {...form.getInputProps('tasksDeleteInterval')}
          />

          <TextInput
            label='Clear Invites Interval'
            description='How often to check and clear expired/used invites.'
            placeholder='30m'
            {...form.getInputProps('tasksClearInvitesInterval')}
          />

          <TextInput
            label='Max Views Interval'
            description='How often to check and delete files that have reached max views.'
            placeholder='30m'
            {...form.getInputProps('tasksMaxViewsInterval')}
          />

          <TextInput
            label='Thumbnails Interval'
            description='How often to check and generate thumbnails for video files.'
            placeholder='30m'
            {...form.getInputProps('tasksThumbnailsInterval')}
          />
        </SimpleGrid>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
