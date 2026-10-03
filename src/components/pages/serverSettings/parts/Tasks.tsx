import type { Response } from '@/lib/api/response';
import { Button, Code, LoadingOverlay, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import SafeTrans from '@/components/SafeTrans';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function Tasks() {
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
      tasksDeleteInterval: data.settings.tasksDeleteInterval,
      tasksClearInvitesInterval: data.settings.tasksClearInvitesInterval,
      tasksMaxViewsInterval: data.settings.tasksMaxViewsInterval,
      tasksThumbnailsInterval: data.settings.tasksThumbnailsInterval,
      tasksMetricsInterval: data.settings.tasksMetricsInterval,
      tasksCleanThumbnailsInterval: data.settings.tasksCleanThumbnailsInterval,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data.tampered.includes(payload.field) || false,
    }),
  });

  const onSubmit = settingsOnSubmit(navigate, form);

  return (
    <>
      <Text size='sm' c='dimmed' mb='md'>
        <SafeTrans t={t} i18nKey='tasks.intro' components={{ code: <Code /> }} />
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap='lg'>
          <TextInput
            label={t('tasks.deleteInterval.label')}
            description={t('tasks.deleteInterval.description')}
            placeholder='30m'
            {...form.getInputProps('tasksDeleteInterval')}
          />

          <TextInput
            label={t('tasks.clearInvitesInterval.label')}
            description={t('tasks.clearInvitesInterval.description')}
            placeholder='30m'
            {...form.getInputProps('tasksClearInvitesInterval')}
          />

          <TextInput
            label={t('tasks.maxViewsInterval.label')}
            description={t('tasks.maxViewsInterval.description')}
            placeholder='30m'
            {...form.getInputProps('tasksMaxViewsInterval')}
          />

          <TextInput
            label={t('tasks.thumbnailsInterval.label')}
            description={t('tasks.thumbnailsInterval.description')}
            placeholder='30m'
            {...form.getInputProps('tasksThumbnailsInterval')}
          />

          <TextInput
            label={t('tasks.cleanThumbnailsInterval.label')}
            description={t('tasks.cleanThumbnailsInterval.description')}
            placeholder='1d'
            {...form.getInputProps('tasksCleanThumbnailsInterval')}
          />

          <TextInput
            label={t('tasks.metricsInterval.label')}
            description={t('tasks.metricsInterval.description')}
            placeholder='30m'
            {...form.getInputProps('tasksMetricsInterval')}
          />
        </Stack>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          {t('common:actions.save')}
        </Button>
      </form>
    </>
  );
}
