import { Response } from '@/lib/api/response';
import {
  Button,
  Collapse,
  ColorInput,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Switch,
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
      discordOnShortenEmbedThumbnail: false,
      discordOnShortenEmbedImageOrVideo: false,
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
      discordOnShortenEmbedThumbnail: (data?.discordOnShortenEmbed as DiscordEmbed)?.thumbnail ?? false,
      discordOnShortenEmbedImageOrVideo: (data?.discordOnShortenEmbed as DiscordEmbed)?.imageOrVideo ?? false,
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
          {...formMain.getInputProps('discordWebhookUrl')}
        />

        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <TextInput
            label='Username'
            description='The username to send notifications as'
            {...formMain.getInputProps('discordUsername')}
          />

          <TextInput
            label='Avatar URL'
            description='The avatar for the webhook'
            placeholder='https://example.com/avatar.png'
            {...formMain.getInputProps('discordAvatarUrl')}
          />
        </SimpleGrid>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
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
              {...formOnUpload.getInputProps('discordOnUploadWebhookUrl')}
            />

            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
              <TextInput
                label='Username'
                description='The username to send notifications as. If this is left blank, the main username will be used'
                {...formOnUpload.getInputProps('discordOnUploadUsername')}
              />

              <TextInput
                label='Avatar URL'
                description='The avatar for the webhook. If this is left blank, the main avatar will be used'
                placeholder='https://example.com/avatar.png'
                {...formOnUpload.getInputProps('discordOnUploadAvatarUrl')}
              />
            </SimpleGrid>

            <Switch
              mt='md'
              label='Embed'
              description='Send the notification as an embed. This will allow for more customization below.'
              {...formOnUpload.getInputProps('discordOnUploadEmbed', { type: 'checkbox' })}
            />

            <Collapse in={formOnUpload.values.discordOnUploadEmbed}>
              <Paper withBorder p='sm' mt='md'>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing='lg'>
                  <TextInput
                    label='Title'
                    description='The title of the embed'
                    {...formOnUpload.getInputProps('discordOnUploadEmbedTitle')}
                  />

                  <TextInput
                    label='Description'
                    description='The description of the embed'
                    {...formOnUpload.getInputProps('discordOnUploadEmbedDescription')}
                  />

                  <TextInput
                    label='Footer'
                    description='The footer of the embed'
                    {...formOnUpload.getInputProps('discordOnUploadEmbedFooter')}
                  />

                  <ColorInput
                    label='Color'
                    description='The color of the embed'
                    {...formOnUpload.getInputProps('discordOnUploadEmbedColor')}
                  />

                  <Switch
                    label='Thumbnail'
                    description="Show the thumbnail (it will show the file if it's an image) in the embed"
                    {...formOnUpload.getInputProps('discordOnUploadEmbedThumbnail', { type: 'checkbox' })}
                  />

                  <Switch
                    label='Image/Video'
                    description='Show the image or video in the embed'
                    {...formOnUpload.getInputProps('discordOnUploadEmbedImageOrVideo', { type: 'checkbox' })}
                  />

                  <Switch
                    label='Timestamp'
                    description='Show the timestamp in the embed'
                    {...formOnUpload.getInputProps('discordOnUploadEmbedTimestamp', { type: 'checkbox' })}
                  />

                  <Switch
                    label='URL'
                    description='Makes the title clickable and links to the URL of the file'
                    {...formOnUpload.getInputProps('discordOnUploadEmbedUrl', { type: 'checkbox' })}
                  />
                </SimpleGrid>
              </Paper>
            </Collapse>

            <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
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
              {...formOnShorten.getInputProps('discordOnShortenWebhookUrl')}
            />

            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
              <TextInput
                label='Username'
                description='The username to send notifications as. If this is left blank, the main username will be used'
                {...formOnShorten.getInputProps('discordOnShortenUsername')}
              />

              <TextInput
                label='Avatar URL'
                description='The avatar for the webhook. If this is left blank, the main avatar will be used'
                placeholder='https://example.com/avatar.png'
                {...formOnShorten.getInputProps('discordOnShortenAvatarUrl')}
              />
            </SimpleGrid>

            <Switch
              mt='md'
              label='Embed'
              description='Send the notification as an embed. This will allow for more customization below.'
              {...formOnShorten.getInputProps('discordOnShortenEmbed', { type: 'checkbox' })}
            />

            <Collapse in={formOnShorten.values.discordOnShortenEmbed}>
              <Paper withBorder p='sm' mt='md'>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing='lg'>
                  <TextInput
                    label='Title'
                    description='The title of the embed'
                    {...formOnShorten.getInputProps('discordOnShortenEmbedTitle')}
                  />

                  <TextInput
                    label='Description'
                    description='The description of the embed'
                    {...formOnShorten.getInputProps('discordOnShortenEmbedDescription')}
                  />

                  <TextInput
                    label='Footer'
                    description='The footer of the embed'
                    {...formOnShorten.getInputProps('discordOnShortenEmbedFooter')}
                  />

                  <ColorInput
                    label='Color'
                    description='The color of the embed'
                    {...formOnShorten.getInputProps('discordOnShortenEmbedColor')}
                  />

                  <Switch
                    label='Thumbnail'
                    description="Show the thumbnail (it will show the file if it's an image) in the embed"
                    {...formOnShorten.getInputProps('discordOnShortenEmbedThumbnail', { type: 'checkbox' })}
                  />

                  <Switch
                    label='Image/Video'
                    description='Show the image or video in the embed'
                    {...formOnShorten.getInputProps('discordOnShortenEmbedImageOrVideo', {
                      type: 'checkbox',
                    })}
                  />

                  <Switch
                    label='Timestamp'
                    description='Show the timestamp in the embed'
                    {...formOnShorten.getInputProps('discordOnShortenEmbedTimestamp', { type: 'checkbox' })}
                  />

                  <Switch
                    label='URL'
                    description='Makes the title clickable and links to the URL of the file'
                    {...formOnShorten.getInputProps('discordOnShortenEmbedUrl', { type: 'checkbox' })}
                  />
                </SimpleGrid>
              </Paper>
            </Collapse>

            <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
              Save
            </Button>
          </form>
        </Paper>
      </SimpleGrid>
    </Paper>
  );
}
