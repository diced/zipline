import type { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function HttpWebhook() {
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
      httpWebhookOnUpload: data.settings.httpWebhookOnUpload,
      httpWebhookOnShorten: data.settings.httpWebhookOnShorten,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data.tampered.includes(payload.field) || false,
    }),
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

    return settingsOnSubmit(navigate, form)(values);
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap='lg'>
        <TextInput
          label={t('httpWebhook.onUpload.label')}
          description={t('httpWebhook.onUpload.description')}
          placeholder='https://example.com/upload'
          {...form.getInputProps('httpWebhookOnUpload')}
        />

        <TextInput
          label={t('httpWebhook.onShorten.label')}
          description={t('httpWebhook.onShorten.description')}
          placeholder='https://example.com/shorten'
          {...form.getInputProps('httpWebhookOnShorten')}
        />
      </Stack>

      <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
