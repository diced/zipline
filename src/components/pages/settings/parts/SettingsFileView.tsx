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
import { mutate } from 'swr';
import { useShallow } from 'zustand/shallow';

const alignIcons: Record<string, React.ReactNode> = {
  left: <IconAlignLeft size='1rem' />,
  center: <IconAlignCenter size='1rem' />,
  right: <IconAlignRight size='1rem' />,
};

export default function SettingsFileView() {
  const [user, setUser] = useUserStore(useShallow((state) => [state.user, state.setUser]));

  if (!user) {
    return (
      <Paper withBorder p='sm'>
        <Title order={2}>Viewing Files</Title>
        <Text c='dimmed' mt='xs'>
          Loading…
        </Text>
      </Paper>
    );
  }

  return <Form user={user} setUser={setUser} />;
}

function Form({ user, setUser }: { user: User; setUser: (u: User) => void }) {
  const form = useForm({
    initialValues: {
      enabled: user.view.enabled || false,
      content: user.view.content || '',
      embed: user.view.embed || false,
      embedMediaOnly: user.view.embedMediaOnly || false,
      embedTitle: user.view.embedTitle || '',
      embedDescription: user.view.embedDescription || '',
      embedSiteName: user.view.embedSiteName || '',
      embedColor: user.view.embedColor || '',
      embedAuthor: user.view.embedAuthor || '',
      embedAuthorUrl: user.view.embedAuthorUrl || '',
      embedProviderUrl: user.view.embedProviderUrl || '',
      align: user.view.align || 'left',
      showMimetype: user.view.showMimetype || false,
      showTags: user.view.showTags || false,
      showFolder: user.view.showFolder || false,
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    const valuesTrimmed = {
      enabled: values.enabled,
      embed: values.embed,
      embedMediaOnly: values.embed ? false : values.embedMediaOnly,
      content: values.content.trim() || null,
      embedTitle: values.embedTitle.trim() || null,
      embedDescription: values.embedDescription.trim() || null,
      embedSiteName: values.embedSiteName.trim() || null,
      embedColor: values.embedColor.trim() || null,
      embedAuthor: values.embedAuthor.trim() || null,
      embedAuthorUrl: values.embedAuthorUrl.trim() || null,
      embedProviderUrl: values.embedProviderUrl.trim() || null,
      align: values.align,
      showMimetype: values.showMimetype,
      showTags: values.showTags,
      showFolder: values.showFolder,
    };

    const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', {
      view: valuesTrimmed,
    });

    if (!data && error) {
      notifications.show({
        title: 'Error while updating view settings',
        message: error.error,
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
      <Text c='dimmed' mt='xs'>
        All text fields support using{' '}
        <Anchor target='_blank' href='https://zipline.diced.sh/docs/guides/variables/'>
          variables.
        </Anchor>
      </Text>
      <Stack gap='sm' mt='xs'>
        <form onSubmit={form.onSubmit(onSubmit)}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing='sm' mb='xs'>
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

            <Switch
              label='Show tags'
              description="Show the file's tags in the view-route"
              disabled={!form.values.enabled}
              {...form.getInputProps('showTags', { type: 'checkbox' })}
            />

            <Switch
              label='Show folder'
              description='Show the name/link of the folder if possible in the view-route'
              disabled={!form.values.enabled}
              {...form.getInputProps('showFolder', { type: 'checkbox' })}
            />
          </SimpleGrid>

          <Textarea
            label='View Content'
            description='Change the content within view-routes. Most HTML is valid, while the use of JavaScript is unavailable.'
            disabled={!form.values.enabled}
            mb='xs'
            minRows={5}
            autosize
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
            label='Enable Embed'
            description='Enable the following embed properties. These properties take advantage of OpenGraph tags. View routes will need to be enabled for this to work.'
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
            label='Media-only link preview'
            description='When embeds are off, still add OpenGraph image/video tags so Discord and similar apps unfurl the media only (no custom title, description, or site name). The URL you paste stays in the message as plain text.'
            disabled={!form.values.enabled || form.values.embed}
            my='xs'
            {...form.getInputProps('embedMediaOnly', { type: 'checkbox' })}
          />

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing='sm'>
            <TextInput
              label='Embed Title'
              description='The bold linked title. Leave blank to use the filename.'
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedTitle')}
            />
            <TextInput
              label='Embed Description'
              description='Text shown below the title.'
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedDescription')}
            />
            <TextInput
              label='Embed Site Name'
              description='Provider/site label shown at the top. Leave blank for "Zipline".'
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedSiteName')}
            />
            <TextInput
              label='Embed Author'
              description='Clickable name shown below the site name. Leave blank to use your username.'
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedAuthor')}
            />
            <TextInput
              label='Embed Author URL'
              description='The URL the author name links to. Leave blank to use your profile URL.'
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedAuthorUrl')}
            />
            <TextInput
              label='Embed Provider URL'
              description='The URL the provider/site name links to. Leave blank to use the site host.'
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedProviderUrl')}
            />
            <ColorInput
              label='Embed Color'
              description='The accent stripe color on the left of the embed.'
              disabled={!form.values.embed || !form.values.enabled}
              {...form.getInputProps('embedColor')}
            />
          </SimpleGrid>

          {form.values.embed && form.values.enabled && (
            <Stack gap='xs' mt='md'>
              <Text size='sm' fw={500}>
                Live Discord Embed Preview
              </Text>
              <Paper
                p='md'
                radius='sm'
                style={{
                  backgroundColor: '#313338',
                  color: '#dbdee1',
                  fontFamily: 'gg sans, "Segoe UI", Tahoma, sans-serif',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: '#2b2d31',
                    borderRadius: '4px',
                    borderLeft: `4px solid ${form.values.embedColor || '#202225'}`,
                    padding: '12px 16px',
                    maxWidth: '520px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    {/* Provider */}
                    <span style={{ fontSize: '12px', color: '#b5bac1', lineHeight: '16px' }}>
                      {parsePreviewText(form.values.embedSiteName, user.username) || 'Zipline'}
                    </span>

                    {/* Author */}
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#00a8fc',
                        lineHeight: '18px',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {parsePreviewText(form.values.embedAuthor, user.username) || user.username}
                    </span>

                    {/* Title */}
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#00a8fc',
                        lineHeight: '22px',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {parsePreviewText(form.values.embedTitle, user.username) || 'image.png'}
                    </span>

                    {/* Description */}
                    {form.values.embedDescription && (
                      <span
                        style={{
                          fontSize: '14px',
                          color: '#dbdee1',
                          lineHeight: '18px',
                          marginTop: '4px',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {parsePreviewText(form.values.embedDescription, user.username)}
                      </span>
                    )}

                    {/* Mock Image Preview */}
                    <div
                      style={{
                        marginTop: '8px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        maxWidth: '400px',
                        aspectRatio: '16/9',
                        backgroundColor: '#1e1f22',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #232428',
                        color: '#949ba4',
                        fontSize: '13px',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Video / Image Preview</span>
                      <span style={{ fontSize: '11px', color: '#80848e', marginTop: '2px' }}>
                        Media content renders here in Discord
                      </span>
                    </div>
                  </div>
                </div>
              </Paper>
            </Stack>
          )}

          <Group justify='left' mt='sm'>
            <Button type='submit' leftSection={<IconDeviceFloppy size='1rem' />}>
              Save
            </Button>
          </Group>
        </form>
      </Stack>
    </Paper>
  );
}

function parsePreviewText(str: string, username: string) {
  if (!str) return '';
  return str
    .replace(/{file\.name}/gi, 'image.png')
    .replace(/{file\.originalName}/gi, 'original_image.png')
    .replace(/{file\.size}/gi, '1.2 MB')
    .replace(/{file\.type}/gi, 'image/png')
    .replace(/{user\.username}/gi, username || 'diced')
    .replace(/{user\.role}/gi, 'ADMIN')
    .replace(/{file\.views}/gi, '42');
}
