import { Response } from '@/lib/api/response';
import {
  Button,
  Collapse,
  ColorInput,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Switch,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

type DiscordEmbed = Record<string, any>;

export default function ServerSettingsDiscord({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();

  const formMain = useForm({
    initialValues: {
      discordWebhookUrl: '',
      discordUsername: '',
      discordAvatarUrl: '',
    },
  });

  const onSubmitMain = async (values: typeof formMain.values) => {
    const sendValues: Record<string, any> = {};

    sendValues.discordWebhookUrl =
      values.discordWebhookUrl?.trim() === '' ? null : values.discordWebhookUrl?.trim();
    sendValues.discordUsername =
      values.discordUsername?.trim() === '' ? null : values.discordUsername?.trim();
    sendValues.discordAvatarUrl =
      values.discordAvatarUrl?.trim() === '' ? null : values.discordAvatarUrl?.trim();

    return settingsOnSubmit(router, formMain)(sendValues);
  };

  const formOnUpload = useForm({
    initialValues: {
      discordOnUploadWebhookUrl: '',
      discordOnUploadUsername: '',
      discordOnUploadAvatarUrl: '',

      discordOnUploadContent: '',

      discordOnUploadEmbed: false,
      discordOnUploadEmbedTitle: '',
      discordOnUploadEmbedDescription: '',
      discordOnUploadEmbedFooter: '',
      discordOnUploadEmbedColor: '',
      discordOnUploadEmbedThumbnail: false,
      discordOnUploadEmbedImageOrVideo: false,
      discordOnUploadEmbedTimestamp: false,
      discordOnUploadEmbedUrl: false,
    },
  });

  const formOnShorten = useForm({
    initialValues: {
      discordOnShortenWebhookUrl: '',
      discordOnShortenUsername: '',
      discordOnShortenAvatarUrl: '',

      discordOnShortenContent: '',

      discordOnShortenEmbed: false,
      discordOnShortenEmbedTitle: '',
      discordOnShortenEmbedDescription: '',
      discordOnShortenEmbedFooter: '',
      discordOnShortenEmbedColor: '',
      discordOnShortenEmbedTimestamp: false,
      discordOnShortenEmbedUrl: false,
    },
  });

  const onSubmitNotif = (type: 'upload' | 'shorten') => async (values: Record<string, any>) => {
    const sendValues: Record<string, any> = {};

    const prefix = type === 'upload' ? 'discordOnUpload' : 'discordOnShorten';

    sendValues[`${prefix}WebhookUrl`] =
      values[`${prefix}WebhookUrl`]?.trim() === '' ? null : values[`${prefix}WebhookUrl`]?.trim();
    sendValues[`${prefix}Username`] =
      values[`${prefix}Username`]?.trim() === '' ? null : values[`${prefix}Username`]?.trim();
    sendValues[`${prefix}AvatarUrl`] =
      values[`${prefix}AvatarUrl`]?.trim() === '' ? null : values[`${prefix}AvatarUrl`]?.trim();
    sendValues[`${prefix}Content`] =
      values[`${prefix}Content`]?.trim() === '' ? null : values[`${prefix}Content`]?.trim();

    if (!values[`${prefix}Embed`]) {
      sendValues[`${prefix}Embed`] = null;
    } else {
      sendValues[`${prefix}Embed`] = {
        title: values[`${prefix}EmbedTitle`]?.trim() === '' ? null : values[`${prefix}EmbedTitle`]?.trim(),
        description:
          values[`${prefix}EmbedDescription`]?.trim() === ''
            ? null
            : values[`${prefix}EmbedDescription`]?.trim(),
        footer: values[`${prefix}EmbedFooter`]?.trim() === '' ? null : values[`${prefix}EmbedFooter`]?.trim(),
        color: values[`${prefix}EmbedColor`]?.trim() === '' ? null : values[`${prefix}EmbedColor`]?.trim(),
        thumbnail: values[`${prefix}EmbedThumbnail`],
        imageOrVideo: values[`${prefix}EmbedImageOrVideo`],
        timestamp: values[`${prefix}EmbedTimestamp`],
        url: values[`${prefix}EmbedUrl`],
      };
    }

    return settingsOnSubmit(router, type === 'upload' ? formOnUpload : formOnShorten)(sendValues);
  };

  useEffect(() => {
    if (!data) return;

    formMain.setValues({
      discordWebhookUrl: data?.discordWebhookUrl ?? '',
      discordUsername: data?.discordUsername ?? '',
      discordAvatarUrl: data?.discordAvatarUrl ?? '',
    });

    formOnUpload.setValues({
      discordOnUploadWebhookUrl: data?.discordOnUploadWebhookUrl ?? '',
      discordOnUploadUsername: data?.discordOnUploadUsername ?? '',
      discordOnUploadAvatarUrl: data?.discordOnUploadAvatarUrl ?? '',

      discordOnUploadContent: data?.discordOnUploadContent ?? '',
      discordOnUploadEmbed: data?.discordOnUploadEmbed ? true : false,
      discordOnUploadEmbedTitle: (data?.discordOnUploadEmbed as DiscordEmbed)?.title ?? '',
      discordOnUploadEmbedDescription: (data?.discordOnUploadEmbed as DiscordEmbed)?.description ?? '',
      discordOnUploadEmbedFooter: (data?.discordOnUploadEmbed as DiscordEmbed)?.footer ?? '',
      discordOnUploadEmbedColor: (data?.discordOnUploadEmbed as DiscordEmbed)?.color ?? '',
      discordOnUploadEmbedThumbnail: (data?.discordOnUploadEmbed as DiscordEmbed)?.thumbnail ?? false,
      discordOnUploadEmbedImageOrVideo: (data?.discordOnUploadEmbed as DiscordEmbed)?.imageOrVideo ?? false,
      discordOnUploadEmbedTimestamp: (data?.discordOnUploadEmbed as DiscordEmbed)?.timestamp ?? false,
      discordOnUploadEmbedUrl: (data?.discordOnUploadEmbed as DiscordEmbed)?.url ?? false,
    });

    formOnShorten.setValues({
      discordOnShortenWebhookUrl: data?.discordOnShortenWebhookUrl ?? '',
      discordOnShortenUsername: data?.discordOnShortenUsername ?? '',
      discordOnShortenAvatarUrl: data?.discordOnShortenAvatarUrl ?? '',

      discordOnShortenContent: data?.discordOnShortenContent ?? '',
      discordOnShortenEmbed: data?.discordOnShortenEmbed ? true : false,
      discordOnShortenEmbedTitle: (data?.discordOnShortenEmbed as DiscordEmbed)?.title ?? '',
      discordOnShortenEmbedDescription: (data?.discordOnShortenEmbed as DiscordEmbed)?.description ?? '',
      discordOnShortenEmbedFooter: (data?.discordOnShortenEmbed as DiscordEmbed)?.footer ?? '',
      discordOnShortenEmbedColor: (data?.discordOnShortenEmbed as DiscordEmbed)?.color ?? '',
      discordOnShortenEmbedTimestamp: (data?.discordOnShortenEmbed as DiscordEmbed)?.timestamp ?? false,
      discordOnShortenEmbedUrl: (data?.discordOnShortenEmbed as DiscordEmbed)?.url ?? false,
    });
  }, [data]);

  return (
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>Discord Webhook</Title>

      <form onSubmit={formMain.onSubmit(onSubmitMain)}>
        <TextInput
          mt='md'
          label='Webhook URL'
          description='The Discord webhook URL to send notifications to'
          placeholder='https://discord.com/api/webhooks/...'
          disabled={data?.locked['discordWebhookUrl']}
          {...formMain.getInputProps('discordWebhookUrl')}
        />

        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <TextInput
            label='Username'
            description='The username to send notifications as'
            disabled={data?.locked['discordUsername']}
            {...formMain.getInputProps('discordUsername')}
          />

          <TextInput
            label='Avatar URL'
            description='The avatar for the webhook'
            placeholder='https://example.com/avatar.png'
            disabled={data?.locked['discordAvatarUrl']}
            {...formMain.getInputProps('discordAvatarUrl')}
          />
        </SimpleGrid>

        <Button
          type='submit'
          mt='md'
          loading={isLoading}
          disabled={
            data?.locked['discordWebhookUrl'] &&
            data?.locked['discordUsername'] &&
            data?.locked['discordAvatarUrl']
          }
          leftSection={<IconDeviceFloppy size='1rem' />}
        >
          Save
        </Button>
      </form>

      <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
        <Paper withBorder p='sm'>
          <Title order={3}>On Upload</Title>

          <form onSubmit={formOnUpload.onSubmit(onSubmitNotif('upload'))}>
            <TextInput
              mt='md'
              label='Webhook URL'
              description='The Discord webhook URL to send notifications to. If this is left blank, the main webhook url will be used'
              placeholder='https://discord.com/api/webhooks/...'
              disabled={data?.locked['discordOnUploadWebhookUrl']}
              {...formOnUpload.getInputProps('discordOnUploadWebhookUrl')}
            />

            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
              <TextInput
                label='Username'
                description='The username to send notifications as. If this is left blank, the main username will be used'
                disabled={data?.locked['discordOnUploadUsername']}
                {...formOnUpload.getInputProps('discordOnUploadUsername')}
              />

              <TextInput
                label='Avatar URL'
                description='The avatar for the webhook. If this is left blank, the main avatar will be used'
                placeholder='https://example.com/avatar.png'
                disabled={data?.locked['discordOnUploadAvatarUrl']}
                {...formOnUpload.getInputProps('discordOnUploadAvatarUrl')}
              />
            </SimpleGrid>

            <Textarea
              mt='md'
              label='Content'
              description='The content of the notification. This can be blank, but at least one of the content or embed fields must be filled out'
              minRows={1}
              maxRows={7}
              disabled={data?.locked['discordOnUploadContent']}
              {...formOnUpload.getInputProps('discordOnUploadContent')}
            />

            <Switch
              mt='md'
              label='Embed'
              description='Send the notification as an embed. This will allow for more customization below.'
              disabled={data?.locked['discordOnUploadEmbed']}
              {...formOnUpload.getInputProps('discordOnUploadEmbed', { type: 'checkbox' })}
            />

            <Collapse in={formOnUpload.values.discordOnUploadEmbed}>
              <Paper withBorder p='sm' mt='md'>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing='lg'>
                  <TextInput
                    label='Title'
                    description='The title of the embed'
                    disabled={data?.locked['discordOnUploadEmbed']}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedTitle')}
                  />

                  <TextInput
                    label='Description'
                    description='The description of the embed'
                    disabled={data?.locked['discordOnUploadEmbed']}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedDescription')}
                  />

                  <TextInput
                    label='Footer'
                    description='The footer of the embed'
                    disabled={data?.locked['discordOnUploadEmbed']}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedFooter')}
                  />

                  <ColorInput
                    label='Color'
                    description='The color of the embed'
                    disabled={data?.locked['discordOnUploadEmbed']}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedColor')}
                  />

                  <Switch
                    label='Thumbnail'
                    description="Show the thumbnail (it will show the file if it's an image) in the embed"
                    disabled={data?.locked['discordOnUploadEmbed']}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedThumbnail', { type: 'checkbox' })}
                  />

                  <Switch
                    label='Image/Video'
                    description='Show the image or video in the embed'
                    disabled={data?.locked['discordOnUploadEmbed']}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedImageOrVideo', { type: 'checkbox' })}
                  />

                  <Switch
                    label='Timestamp'
                    description='Show the timestamp in the embed'
                    disabled={data?.locked['discordOnUploadEmbed']}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedTimestamp', { type: 'checkbox' })}
                  />

                  <Switch
                    label='URL'
                    description='Makes the title clickable and links to the URL of the file'
                    disabled={data?.locked['discordOnUploadEmbed']}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedUrl', { type: 'checkbox' })}
                  />
                </SimpleGrid>
              </Paper>
            </Collapse>

            <Button
              type='submit'
              mt='md'
              loading={isLoading}
              disabled={data?.locked['discordOnUploadEmbed']}
              leftSection={<IconDeviceFloppy size='1rem' />}
            >
              Save
            </Button>
          </form>
        </Paper>

        <Paper withBorder p='sm'>
          <Title order={3}>On Shorten</Title>

          <form onSubmit={formOnShorten.onSubmit(onSubmitNotif('shorten'))}>
            <TextInput
              mt='md'
              label='Webhook URL'
              description='The Discord webhook URL to send notifications to. If this is left blank, the main webhook url will be used'
              placeholder='https://discord.com/api/webhooks/...'
              disabled={data?.locked['discordOnShortenWebhookUrl']}
              {...formOnShorten.getInputProps('discordOnShortenWebhookUrl')}
            />

            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
              <TextInput
                label='Username'
                description='The username to send notifications as. If this is left blank, the main username will be used'
                disabled={data?.locked['discordOnShortenUsername']}
                {...formOnShorten.getInputProps('discordOnShortenUsername')}
              />

              <TextInput
                label='Avatar URL'
                description='The avatar for the webhook. If this is left blank, the main avatar will be used'
                placeholder='https://example.com/avatar.png'
                disabled={data?.locked['discordOnShortenAvatarUrl']}
                {...formOnShorten.getInputProps('discordOnShortenAvatarUrl')}
              />
            </SimpleGrid>

            <Textarea
              mt='md'
              label='Content'
              description='The content of the notification. This can be blank, but at least one of the content or embed fields must be filled out'
              minRows={1}
              maxRows={7}
              disabled={data?.locked['discordOnShortenContent']}
              {...formOnShorten.getInputProps('discordOnShortenContent')}
            />

            <Switch
              mt='md'
              label='Embed'
              description='Send the notification as an embed. This will allow for more customization below.'
              disabled={data?.locked['discordOnShortenEmbed']}
              {...formOnShorten.getInputProps('discordOnShortenEmbed', { type: 'checkbox' })}
            />

            <Collapse in={formOnShorten.values.discordOnShortenEmbed}>
              <Paper withBorder p='sm' mt='md'>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing='lg'>
                  <TextInput
                    label='Title'
                    description='The title of the embed'
                    disabled={data?.locked['discordOnShortenEmbed']}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedTitle')}
                  />

                  <TextInput
                    label='Description'
                    description='The description of the embed'
                    disabled={data?.locked['discordOnShortenEmbed']}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedDescription')}
                  />

                  <TextInput
                    label='Footer'
                    description='The footer of the embed'
                    disabled={data?.locked['discordOnShortenEmbed']}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedFooter')}
                  />

                  <ColorInput
                    label='Color'
                    description='The color of the embed'
                    disabled={data?.locked['discordOnShortenEmbed']}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedColor')}
                  />

                  <Switch
                    label='Timestamp'
                    description='Show the timestamp in the embed'
                    disabled={data?.locked['discordOnShortenEmbed']}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedTimestamp', { type: 'checkbox' })}
                  />

                  <Switch
                    label='URL'
                    description='Makes the title clickable and links to the URL of the file'
                    disabled={data?.locked['discordOnShortenEmbed']}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedUrl', { type: 'checkbox' })}
                  />
                </SimpleGrid>
              </Paper>
            </Collapse>

            <Button
              type='submit'
              mt='md'
              loading={isLoading}
              disabled={data?.locked['discordOnShortenEmbed']}
              leftSection={<IconDeviceFloppy size='1rem' />}
            >
              Save
            </Button>
          </form>
        </Paper>
      </SimpleGrid>
    </Paper>
  );
}
