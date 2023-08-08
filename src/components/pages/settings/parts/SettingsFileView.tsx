import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { useUserStore } from '@/lib/store/user';
import {
  ActionIcon,
  Button,
  ColorInput,
  CopyButton,
  Divider,
  Group,
  Paper,
  PasswordInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { hasLength, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconFileX, IconUserCancel } from '@tabler/icons-react';
import { forwardRef, useEffect, useState } from 'react';
import { mutate } from 'swr';

export default function SettingsFileView() {
  const [user, setUser] = useUserStore((state) => [state.user, state.setUser]);

  const form = useForm({
    initialValues: {
      enabled: user?.view.enabled ?? false,
      content: user?.view.content ?? '',
      embed: user?.view.embed ?? false,
      embedTitle: user?.view.embedTitle ?? '',
      embedDescription: user?.view.embedDescription ?? '',
      embedSiteName: user?.view.embedSiteName ?? '',
      embedColor: user?.view.embedColor ?? '',
      align: user?.view.align ?? 'left',
      showMimetype: user?.view.showMimetype ?? false,
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const valuesTrimmed = {
      enabled: values.enabled,
      embed: values.embed,
      content: values.content.trim() || null,
      embedTitle: values.embedTitle.trim() || null,
      embedDescription: values.embedDescription.trim() || null,
      embedSiteName: values.embedSiteName.trim() || null,
      embedColor: values.embedColor.trim() || null,
      align: values.align,
      showMimetype: values.showMimetype,
    };

    const { data, error } = await fetchApi<Response['/api/user']>(`/api/user`, 'PATCH', {
      view: valuesTrimmed,
    });

    if (!data && error) {
      notifications.show({
        title: 'Error while updating view settings',
        message: error.message,
        color: 'red',
        icon: <IconFileX size='1rem' />,
      });
    }

    if (!data?.user) return;

    mutate('/api/user');
    setUser(data.user);
    notifications.show({
      message: 'View settings updated',
      color: 'green',
      icon: <IconCheck size='1rem' />,
    });
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Viewing Files</Title>
      <Text color='dimmed' mt='xs'>
        All text fields support using variables.
      </Text>
      <Stack spacing='sm' mt='xs'>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <SimpleGrid cols={2} spacing='sm' breakpoints={[{ maxWidth: 'sm', cols: 1 }]} mb='xs'>
            <Switch
              label='Enable View Routes'
              description='Enable viewing files through customizable view-routes'
              {...form.getInputProps('enabled', { type: 'checkbox' })}
            />

            <Switch
              label='Show mimetype'
              description='Show the mimetype of the file in the view-route'
              disabled={!form.values.enabled}
              {...form.getInputProps('showMimetype', { type: 'checkbox' })}
            />
          </SimpleGrid>

          <Textarea
            label='View Content'
            description='Change the content within view-routes. Most HTML is valid, while the use of JavaScript is unavailable.'
            disabled={!form.values.enabled}
            mb='xs'
            {...form.getInputProps('content')}
          />

          <Select
            label='View Content Alignment'
            description='Change the alignment of the content within view-routes'
            data={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
            itemComponent={({ label, value, ...props }) => (
              <Group position={value} {...props}>
                {label}
              </Group>
            )}
            disabled={!form.values.enabled}
            {...form.getInputProps('align')}
          />

          <Divider my='sm' />

          <Switch
            label='Enable Embed'
            description='Enable the following embed properties. These properties take advantage of OpenGraph tags.'
            my='xs'
            {...form.getInputProps('embed', { type: 'checkbox' })}
          />

          <SimpleGrid cols={2} spacing='sm' breakpoints={[{ maxWidth: 'sm', cols: 1 }]}>
            <TextInput
              label='Embed Title'
              disabled={!form.values.embed}
              {...form.getInputProps('embedTitle')}
            />
            <TextInput
              label='Embed Description'
              disabled={!form.values.embed}
              {...form.getInputProps('embedDescription')}
            />
            <TextInput
              label='Embed Site Name'
              disabled={!form.values.embed}
              {...form.getInputProps('embedSiteName')}
            />
            <ColorInput
              label='Embed Color'
              disabled={!form.values.embed}
              {...form.getInputProps('embedColor')}
            />
          </SimpleGrid>

          <Group position='left' mt='sm'>
            <Button variant='outline' color='gray' type='submit'>
              Save
            </Button>
          </Group>
        </form>
      </Stack>
    </Paper>
  );
}
