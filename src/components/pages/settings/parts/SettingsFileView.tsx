import type { User } from '@/lib/db/models/user';
import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useUserStore } from '@/lib/client/store/user';
import {
  Anchor,
  Button,
  ColorInput,
  Divider,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconCheck,
  IconDeviceFloppy,
  IconFileX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import SafeTrans from '@/components/SafeTrans';
import { mutate } from 'swr';
import { useShallow } from 'zustand/shallow';

const alignIcons: Record<string, React.ReactNode> = {
  left: <IconAlignLeft size='1rem' />,
  center: <IconAlignCenter size='1rem' />,
  right: <IconAlignRight size='1rem' />,
};

export default function SettingsFileView() {
  const { t } = useTranslation('settings');
  const [user, setUser] = useUserStore(useShallow((state) => [state.user, state.setUser]));

  if (!user) {
    return (
      <Paper withBorder p='sm'>
        <Title order={2}>{t('fileView.title')}</Title>
        <Text c='dimmed' mt='xs'>
          {t('loading')}
        </Text>
      </Paper>
    );
  }

  return <Form user={user} setUser={setUser} />;
}

function Form({ user, setUser }: { user: User; setUser: (u: User) => void }) {
  const { t } = useTranslation(['settings', 'common']);
  const form = useForm({
    initialValues: {
      enabled: user.view.enabled || false,
      disableTextFiles: user.view.disableTextFiles || false,
      content: user.view.content || '',
      embed: user.view.embed || false,
      embedMediaOnly: user.view.embedMediaOnly || false,
      embedTitle: user.view.embedTitle || '',
      embedDescription: user.view.embedDescription || '',
      embedSiteName: user.view.embedSiteName || '',
      embedColor: user.view.embedColor || '',
      align: user.view.align || 'left',
      showMimetype: user.view.showMimetype || false,
      showTags: user.view.showTags || false,
      showFolder: user.view.showFolder || false,
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const view = {
      enabled: values.enabled,
      disableTextFiles: values.disableTextFiles,
      embed: values.embed,
      embedMediaOnly: values.embed ? false : values.embedMediaOnly,
      content: values.content.trim() || null,
      embedTitle: values.embedTitle.trim() || null,
      embedDescription: values.embedDescription.trim() || null,
      embedSiteName: values.embedSiteName.trim() || null,
      embedColor: values.embedColor.trim() || null,
      align: values.align,
      showMimetype: values.showMimetype,
      showTags: values.showTags,
      showFolder: values.showFolder,
    };

    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', {
      view,
    });

    if (!data && error) {
      notifications.show({
        title: t('fileView.notifications.error.title'),
        message: error.error,
        color: 'red',
        icon: <IconFileX size='1rem' />,
      });
    }

    if (!data?.user) return;

    mutate('/api/user');
    setUser(data.user);
    notifications.show({
      message: t('fileView.notifications.updated.message'),
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>{t('fileView.title')}</Title>
      <Text c='dimmed' mt='xs'>
        <SafeTrans
          t={t}
          i18nKey='fileView.variablesHint'
          components={{
            anchor: <Anchor target='_blank' href='https://zipline.diced.sh/docs/guides/variables/' />,
          }}
        />
      </Text>
      <Stack gap='sm' mt='xs'>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing='sm' mb='xs'>
            <Switch
              label={t('fileView.disableTextFiles.label')}
              description={t('fileView.disableTextFiles.description')}
              {...form.getInputProps('disableTextFiles', { type: 'checkbox' })}
            />

            <Switch
              label={t('fileView.enabled.label')}
              description={t('fileView.enabled.description')}
              {...form.getInputProps('enabled', { type: 'checkbox' })}
            />

            <Switch
              label={t('fileView.showMimetype.label')}
              description={t('fileView.showMimetype.description')}
              disabled={!form.values.enabled}
              {...form.getInputProps('showMimetype', { type: 'checkbox' })}
            />

            <Switch
              label={t('fileView.showTags.label')}
              description={t('fileView.showTags.description')}
              disabled={!form.values.enabled}
              {...form.getInputProps('showTags', { type: 'checkbox' })}
            />

            <Switch
              label={t('fileView.showFolder.label')}
              description={t('fileView.showFolder.description')}
              disabled={!form.values.enabled}
              {...form.getInputProps('showFolder', { type: 'checkbox' })}
            />
          </SimpleGrid>

          <Textarea
            label={t('fileView.content.label')}
            description={t('fileView.content.description')}
            disabled={!form.values.enabled}
            mb='xs'
            minRows={5}
            autosize
            {...form.getInputProps('content')}
          />

          <Select
            label={t('fileView.align.label')}
            description={t('fileView.align.description')}
            data={[
              { value: 'left', label: t('fileView.align.options.left') },
              { value: 'center', label: t('fileView.align.options.center') },
              { value: 'right', label: t('fileView.align.options.right') },
            ]}
            renderOption={({ option }) => (
              <Group gap='xs'>
                {alignIcons[option.value]}
                {option.label}
              </Group>
            )}
            disabled={!form.values.enabled}
            {...form.getInputProps('align')}
          />

          <Divider my='sm' />

          <Switch
            label={t('fileView.embed.label')}
            description={t('fileView.embed.description')}
            disabled={!form.values.enabled}
            my='xs'
            {...form.getInputProps('embed', { type: 'checkbox' })}
            onChange={(event) => {
              form.getInputProps('embed', { type: 'checkbox' }).onChange(event);
              if (event.currentTarget.checked) {
                form.setFieldValue('embedMediaOnly', false);
              }
            }}
          />

          <Switch
            label={t('fileView.embedMediaOnly.label')}
            description={t('fileView.embedMediaOnly.description')}
            disabled={!form.values.enabled || form.values.embed}
            my='xs'
            {...form.getInputProps('embedMediaOnly', { type: 'checkbox' })}
          />

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing='sm'>
            <TextInput
              label={t('fileView.embedTitle.label')}
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedTitle')}
            />
            <TextInput
              label={t('fileView.embedDescription.label')}
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedDescription')}
            />
            <TextInput
              label={t('fileView.embedSiteName.label')}
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedSiteName')}
            />
            <ColorInput
              label={t('fileView.embedColor.label')}
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedColor')}
            />
          </SimpleGrid>

          <Group justify='left' mt='sm'>
            <Button type='submit' leftSection={<IconDeviceFloppy size='1rem' />}>
              {t('common:actions.save')}
            </Button>
          </Group>
        </form>
      </Stack>
    </Paper>
  );
}
