import { Response } from '@/lib/api/response';
import { Button, NumberInput, Paper, SimpleGrid, Switch, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function ServerSettingsInvites({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      invitesEnabled: true,
      invitesLength: 6,
    },
  });

  const onSubmit = settingsOnSubmit(router, form);

  useEffect(() => {
    if (!data) return;

    form.setValues({
      invitesEnabled: data?.invitesEnabled ?? true,
      invitesLength: data?.invitesLength ?? 6,
    });
  }, [data]);

  return (
    <Paper withBorder p='sm' h='100%'>
      <Title order={2}>Invites</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <Switch
            label='Enable Chunks'
            description='Enable chunked uploads.'
            {...form.getInputProps('chunksEnabled', { type: 'checkbox' })}
          />

          <NumberInput
            label='Length'
            description='The length of the invite code.'
            placeholder='6'
            min={1}
            max={64}
            {...form.getInputProps('invitesLength')}
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
