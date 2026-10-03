import type { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, Stack, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function Chunks() {
  const { data, isLoading } = useServerSettings();

  return (
    <>
      <LoadingOverlay visible={isLoading} bdrs='md' />
      {data ? <Form data={data} isLoading={isLoading} /> : null}
    </>
  );
}

function Form({ data, isLoading }: { data: Response['/api/server/settings']; isLoading: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation(['serverSettings', 'common']);

  const form = useForm({
    initialValues: {
      chunksEnabled: data.settings.chunksEnabled,
      chunksMax: data.settings.chunksMax,
      chunksSize: data.settings.chunksSize,
    },
    enhanceGetInputProps: (payload: any): object => ({
      disabled:
        data.tampered.includes(payload.field) ||
        (payload.field !== 'chunksEnabled' && !form.values.chunksEnabled) ||
        false,
    }),
  });

  const onSubmit = settingsOnSubmit(navigate, form);

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap='lg'>
        <Switch
          label={t('chunks.enabled.label')}
          description={t('chunks.enabled.description')}
          {...form.getInputProps('chunksEnabled', { type: 'checkbox' })}
        />

        <TextInput
          label={t('chunks.max.label')}
          description={t('chunks.max.description')}
          placeholder='95mb'
          disabled={!form.values.chunksEnabled}
          {...form.getInputProps('chunksMax')}
        />

        <TextInput
          label={t('chunks.size.label')}
          description={t('chunks.size.description')}
          placeholder='25mb'
          disabled={!form.values.chunksEnabled}
          {...form.getInputProps('chunksSize')}
        />
      </Stack>

      <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
