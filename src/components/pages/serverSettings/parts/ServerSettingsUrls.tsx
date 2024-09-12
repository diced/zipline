import { Response } from '@/lib/api/response';
import { Button, NumberInput, Paper, SimpleGrid, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function ServerSettingsUrls({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      urlsRoute: '/go',
      urlsLength: 6,
    },
  });

  const onSubmit = settingsOnSubmit(router, form);

  useEffect(() => {
    if (!data) return;

    form.setValues({
      urlsRoute: data?.urlsRoute ?? '/go',
      urlsLength: data?.urlsLength ?? 6,
    });
  }, [data]);

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>URL Shortener</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <TextInput
            label='Route'
            description='The route to use for short URLs.'
            placeholder='/go'
            {...form.getInputProps('urlsRoute')}
          />

          <NumberInput
            label='Length'
            description='The length of the short URL (for randomly generated names).'
            placeholder='6'
            min={1}
            max={64}
            {...form.getInputProps('urlsLength')}
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
