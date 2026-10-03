import type { Response } from '@/lib/api/response';
import { Button, ColorInput, Group, LoadingOverlay, Stack, Switch, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function PWA() {
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
      pwaEnabled: data.settings.pwaEnabled,
      pwaTitle: data.settings.pwaTitle,
      pwaShortName: data.settings.pwaShortName,
      pwaDescription: data.settings.pwaDescription,
      pwaThemeColor: data.settings.pwaThemeColor,
      pwaBackgroundColor: data.settings.pwaBackgroundColor,
    },
    enhanceGetInputProps: (payload: any): object => ({
      disabled:
        data.tampered.includes(payload.field) ||
        (payload.field !== 'pwaEnabled' && !form.values.pwaEnabled) ||
        false,
    }),
  });

  const onSubmit = async (values: typeof form.values) => {
    const sendValues: Record<string, any> = {};

    sendValues.pwaTitle = values.pwaTitle.trim() === '' ? null : values.pwaTitle.trim();
    sendValues.pwaShortName = values.pwaShortName.trim() === '' ? null : values.pwaShortName.trim();
    sendValues.pwaDescription = values.pwaDescription.trim() === '' ? null : values.pwaDescription.trim();

    return settingsOnSubmit(
      navigate,
      form,
    )({
      ...sendValues,
      pwaEnabled: values.pwaEnabled,
      pwaThemeColor: values.pwaThemeColor,
      pwaBackgroundColor: values.pwaBackgroundColor,
    });
  };

  return (
    <>
      <Text size='sm' c='dimmed' mb='md'>
        {t('pwa.intro')}
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap='lg'>
          <Switch
            label={t('pwa.enabled.label')}
            description={t('pwa.enabled.description')}
            {...form.getInputProps('pwaEnabled', { type: 'checkbox' })}
          />

          <TextInput
            label={t('pwa.title.label')}
            description={t('pwa.title.description')}
            placeholder='Zipline'
            {...form.getInputProps('pwaTitle')}
          />

          <TextInput
            label={t('pwa.shortName.label')}
            description={t('pwa.shortName.description')}
            placeholder='Zipline'
            {...form.getInputProps('pwaShortName')}
          />

          <TextInput
            label={t('pwa.description.label')}
            description={t('pwa.description.description')}
            placeholder='Zipline'
            {...form.getInputProps('pwaDescription')}
          />

          <ColorInput
            label={t('pwa.themeColor.label')}
            description={t('pwa.themeColor.description')}
            placeholder='#000000'
            {...form.getInputProps('pwaThemeColor')}
          />

          <ColorInput
            label={t('pwa.backgroundColor.label')}
            description={t('pwa.backgroundColor.description')}
            placeholder='#ffffff'
            {...form.getInputProps('pwaBackgroundColor')}
          />
        </Stack>
        <Group mt='md'>
          <Button type='submit' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
            {t('common:actions.save')}
          </Button>
          <Button onClick={() => window.location.reload()} leftSection={<IconRefresh size='1rem' />}>
            {t('common:actions.refresh')}
          </Button>
        </Group>
      </form>
    </>
  );
}
