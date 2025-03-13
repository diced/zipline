import { Response } from '@/lib/api/response';
import {
  Button,
  ColorInput,
  Group,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';
import { EnvTooltip } from '..';

export default function ServerSettingsPWA({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      pwaEnabled: false,
      pwaTitle: '',
      pwaShortName: '',
      pwaDescription: '',
      pwaThemeColor: '',
      pwaBackgroundColor: '',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const sendValues: Record<string, any> = {};

    sendValues.pwaTitle = values.pwaTitle.trim() === '' ? null : values.pwaTitle.trim();
    sendValues.pwaShortName = values.pwaShortName.trim() === '' ? null : values.pwaShortName.trim();
    sendValues.pwaDescription = values.pwaDescription.trim() === '' ? null : values.pwaDescription.trim();

    return settingsOnSubmit(
      router,
      form,
    )({
      ...sendValues,
      pwaEnabled: values.pwaEnabled,
      pwaThemeColor: values.pwaThemeColor,
      pwaBackgroundColor: values.pwaBackgroundColor,
    });
  };

  useEffect(() => {
    form.setValues({
      pwaEnabled: data?.pwaEnabled ?? false,
      pwaTitle: data?.pwaTitle ?? '',
      pwaShortName: data?.pwaShortName ?? '',
      pwaDescription: data?.pwaDescription ?? '',
      pwaThemeColor: data?.pwaThemeColor ?? '',
      pwaBackgroundColor: data?.pwaBackgroundColor ?? '',
    });
  }, [data]);

  return (
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>PWA</Title>

      <Text size='sm' c='dimmed'>
        Refresh the page after enabling PWA to see any changes.
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <EnvTooltip envVar='PWA_ENABLED' data={data} varKey='pwaEnabled'>
          <Switch
            mt='md'
            label='PWA Enabled'
            description='Allow users to install the Zipline PWA on their devices.'
            {...form.getInputProps('pwaEnabled', { type: 'checkbox' })}
          />
        </EnvTooltip>

        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <EnvTooltip envVar='PWA_TITLE' data={data} varKey='pwaTitle'>
            <TextInput
              label='Title'
              description='The title for the PWA'
              placeholder='Zipline'
              disabled={!form.values.pwaEnabled}
              {...form.getInputProps('pwaTitle')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='PWA_SHORT_NAME' data={data} varKey='pwaShortName'>
            <TextInput
              label='Short Name'
              description='The short name for the PWA'
              placeholder='Zipline'
              disabled={!form.values.pwaEnabled}
              {...form.getInputProps('pwaShortName')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='PWA_DESCRIPTION' data={data} varKey='pwaDescription'>
            <TextInput
              label='Description'
              description='The description for the PWA'
              placeholder='Zipline'
              disabled={!form.values.pwaEnabled}
              {...form.getInputProps('pwaDescription')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='PWA_THEME_COLOR' data={data} varKey='pwaThemeColor'>
            <ColorInput
              label='Theme Color'
              description='The theme color for the PWA'
              placeholder='#000000'
              disabled={!form.values.pwaEnabled}
              {...form.getInputProps('pwaThemeColor')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='PWA_BACKGROUND_COLOR' data={data} varKey='pwaBackgroundColor'>
            <ColorInput
              label='Background Color'
              description='The background color for the PWA'
              placeholder='#ffffff'
              disabled={!form.values.pwaEnabled}
              {...form.getInputProps('pwaBackgroundColor')}
            />
          </EnvTooltip>
        </SimpleGrid>

        <Group mt='md'>
          <Button type='submit' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
            Save
          </Button>
          <Button onClick={() => router.reload()} leftSection={<IconRefresh size='1rem' />}>
            Refresh
          </Button>
        </Group>
      </form>
    </Paper>
  );
}
