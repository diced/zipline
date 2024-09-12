import { Response } from '@/lib/api/response';
import { Button, Paper, SimpleGrid, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function ServerSettingsHttpWebhook({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      httpWebhookOnUpload: '',
      httpWebhookOnShorten: '',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    for (const key in values) {
      if ((values[key as keyof typeof form.values] as string)?.trim() === '') {
        // @ts-ignore
        values[key as keyof typeof form.values] = null;
      } else {
        // @ts-ignore
        values[key as keyof typeof form.values] = (values[key as keyof typeof form.values] as string)?.trim();
      }
    }

    return settingsOnSubmit(router, form)(values);
  };

  useEffect(() => {
    if (!data) return;

    form.setValues({
      httpWebhookOnUpload: data?.httpWebhookOnUpload ?? '',
      httpWebhookOnShorten: data?.httpWebhookOnShorten ?? '',
    });
  }, [data]);

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>HTTP Webhooks</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <TextInput
            label='On Upload'
            description='The URL to send a POST request to when a file is uploaded.'
            placeholder='https://example.com/upload'
            {...form.getInputProps('httpWebhookOnUpload')}
          />

          <TextInput
            label='On Shorten'
            description='The URL to send a POST request to when a URL is shortened.'
            placeholder='https://example.com/shorten'
            {...form.getInputProps('httpWebhookOnShorten')}
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
