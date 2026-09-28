import type { Response } from '@/lib/api/response';
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
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

type DiscordEmbed = Record<string, any>;

export default function Discord() {
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

  const formMain = useForm({
    initialValues: {
      discordWebhookUrl: data.settings.discordWebhookUrl,
      discordUsername: data.settings.discordUsername,
      discordAvatarUrl: data.settings.discordAvatarUrl,
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

    return settingsOnSubmit(navigate, formMain)(sendValues);
  };

  const formOnUpload = useForm({
    initialValues: {
      discordOnUploadWebhookUrl: data.settings.discordOnUploadWebhookUrl,
      discordOnUploadUsername: data.settings.discordOnUploadUsername,
      discordOnUploadAvatarUrl: data.settings.discordOnUploadAvatarUrl,

      discordOnUploadContent: data.settings.discordOnUploadContent,

      discordOnUploadEmbed: Boolean(data.settings.discordOnUploadEmbed),
      discordOnUploadEmbedTitle: (data.settings.discordOnUploadEmbed as DiscordEmbed | null)?.title || '',
      discordOnUploadEmbedDescription:
        (data.settings.discordOnUploadEmbed as DiscordEmbed | null)?.description || '',
      discordOnUploadEmbedFooter: (data.settings.discordOnUploadEmbed as DiscordEmbed | null)?.footer || '',
      discordOnUploadEmbedColor: (data.settings.discordOnUploadEmbed as DiscordEmbed | null)?.color || '',
      discordOnUploadEmbedThumbnail: !!(data.settings.discordOnUploadEmbed as DiscordEmbed | null)?.thumbnail,
      discordOnUploadEmbedImageOrVideo: !!(data.settings.discordOnUploadEmbed as DiscordEmbed | null)
        ?.imageOrVideo,
      discordOnUploadEmbedTimestamp: !!(data.settings.discordOnUploadEmbed as DiscordEmbed | null)?.timestamp,
      discordOnUploadEmbedUrl: !!(data.settings.discordOnUploadEmbed as DiscordEmbed | null)?.url,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data.tampered.includes(payload.field) || false,
    }),
  });

  const formOnShorten = useForm({
    initialValues: {
      discordOnShortenWebhookUrl: data.settings.discordOnShortenWebhookUrl,
      discordOnShortenUsername: data.settings.discordOnShortenUsername,
      discordOnShortenAvatarUrl: data.settings.discordOnShortenAvatarUrl,

      discordOnShortenContent: data.settings.discordOnShortenContent,

      discordOnShortenEmbed: Boolean(data.settings.discordOnShortenEmbed),
      discordOnShortenEmbedTitle: (data.settings.discordOnShortenEmbed as DiscordEmbed | null)?.title || '',
      discordOnShortenEmbedDescription:
        (data.settings.discordOnShortenEmbed as DiscordEmbed | null)?.description || '',
      discordOnShortenEmbedFooter: (data.settings.discordOnShortenEmbed as DiscordEmbed | null)?.footer || '',
      discordOnShortenEmbedColor: (data.settings.discordOnShortenEmbed as DiscordEmbed | null)?.color || '',
      discordOnShortenEmbedTimestamp: !!(data.settings.discordOnShortenEmbed as DiscordEmbed | null)
        ?.timestamp,
      discordOnShortenEmbedUrl: !!(data.settings.discordOnShortenEmbed as DiscordEmbed | null)?.url,
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

    return settingsOnSubmit(navigate, type === 'upload' ? formOnUpload : formOnShorten)(sendValues);
  };

  return (
    <>
      <form onSubmit={formMain.onSubmit(onSubmitMain)}>
        <TextInput
          label={t('discord.main.webhookUrl.label')}
          description={t('discord.main.webhookUrl.description')}
          placeholder='https://discord.com/api/webhooks/...'
          {...formMain.getInputProps('discordWebhookUrl')}
        />

        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <TextInput
            label={t('discord.main.username.label')}
            description={t('discord.main.username.description')}
            {...formMain.getInputProps('discordUsername')}
          />

          <TextInput
            label={t('discord.main.avatarUrl.label')}
            description={t('discord.main.avatarUrl.description')}
            placeholder='https://example.com/avatar.png'
            {...formMain.getInputProps('discordAvatarUrl')}
          />
        </SimpleGrid>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          {t('common:actions.save')}
        </Button>
      </form>

      <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
        <Paper withBorder p='sm'>
          <Title order={3}>{t('discord.onUpload.title')}</Title>

          <form onSubmit={formOnUpload.onSubmit(onSubmitNotif('upload'))}>
            <TextInput
              mt='md'
              label={t('discord.notification.webhookUrl.label')}
              description={t('discord.notification.webhookUrl.description')}
              placeholder='https://discord.com/api/webhooks/...'
              {...formOnUpload.getInputProps('discordOnUploadWebhookUrl')}
            />

            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
              <TextInput
                label={t('discord.notification.username.label')}
                description={t('discord.notification.username.description')}
                {...formOnUpload.getInputProps('discordOnUploadUsername')}
              />

              <TextInput
                label={t('discord.notification.avatarUrl.label')}
                description={t('discord.notification.avatarUrl.description')}
                placeholder='https://example.com/avatar.png'
                {...formOnUpload.getInputProps('discordOnUploadAvatarUrl')}
              />
            </SimpleGrid>

            <Textarea
              mt='md'
              label={t('discord.notification.content.label')}
              description={t('discord.notification.content.description')}
              minRows={1}
              maxRows={7}
              {...formOnUpload.getInputProps('discordOnUploadContent')}
            />

            <Switch
              mt='md'
              label={t('discord.notification.embed.label')}
              description={t('discord.notification.embed.description')}
              {...formOnUpload.getInputProps('discordOnUploadEmbed', { type: 'checkbox' })}
            />

            <Collapse expanded={formOnUpload.values.discordOnUploadEmbed}>
              <Paper withBorder p='sm' mt='md'>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing='lg'>
                  <TextInput
                    label={t('discord.embed.title.label')}
                    description={t('discord.embed.title.description')}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedTitle')}
                  />

                  <TextInput
                    label={t('discord.embed.description.label')}
                    description={t('discord.embed.description.description')}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedDescription')}
                  />

                  <TextInput
                    label={t('discord.embed.footer.label')}
                    description={t('discord.embed.footer.description')}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedFooter')}
                  />

                  <ColorInput
                    label={t('discord.embed.color.label')}
                    description={t('discord.embed.color.description')}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedColor')}
                  />

                  <Switch
                    label={t('discord.embed.thumbnail.label')}
                    description={t('discord.embed.thumbnail.description')}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedThumbnail', { type: 'checkbox' })}
                  />

                  <Switch
                    label={t('discord.embed.imageOrVideo.label')}
                    description={t('discord.embed.imageOrVideo.description')}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedImageOrVideo', { type: 'checkbox' })}
                  />

                  <Switch
                    label={t('discord.embed.timestamp.label')}
                    description={t('discord.embed.timestamp.description')}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedTimestamp', { type: 'checkbox' })}
                  />

                  <Switch
                    label={t('discord.embed.url.label')}
                    description={t('discord.embed.url.description')}
                    {...formOnUpload.getInputProps('discordOnUploadEmbedUrl', { type: 'checkbox' })}
                  />
                </SimpleGrid>
              </Paper>
            </Collapse>

            <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
              {t('common:actions.save')}
            </Button>
          </form>
        </Paper>

        <Paper withBorder p='sm'>
          <Title order={3}>{t('discord.onShorten.title')}</Title>

          <form onSubmit={formOnShorten.onSubmit(onSubmitNotif('shorten'))}>
            <TextInput
              mt='md'
              label={t('discord.notification.webhookUrl.label')}
              description={t('discord.notification.webhookUrl.description')}
              placeholder='https://discord.com/api/webhooks/...'
              {...formOnShorten.getInputProps('discordOnShortenWebhookUrl')}
            />

            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
              <TextInput
                label={t('discord.notification.username.label')}
                description={t('discord.notification.username.description')}
                {...formOnShorten.getInputProps('discordOnShortenUsername')}
              />

              <TextInput
                label={t('discord.notification.avatarUrl.label')}
                description={t('discord.notification.avatarUrl.description')}
                placeholder='https://example.com/avatar.png'
                {...formOnShorten.getInputProps('discordOnShortenAvatarUrl')}
              />
            </SimpleGrid>

            <Textarea
              mt='md'
              label={t('discord.notification.content.label')}
              description={t('discord.notification.content.description')}
              minRows={1}
              maxRows={7}
              {...formOnShorten.getInputProps('discordOnShortenContent')}
            />

            <Switch
              mt='md'
              label={t('discord.notification.embed.label')}
              description={t('discord.notification.embed.description')}
              {...formOnShorten.getInputProps('discordOnShortenEmbed', { type: 'checkbox' })}
            />

            <Collapse expanded={formOnShorten.values.discordOnShortenEmbed}>
              <Paper withBorder p='sm' mt='md'>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing='lg'>
                  <TextInput
                    label={t('discord.embed.title.label')}
                    description={t('discord.embed.title.description')}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedTitle')}
                  />

                  <TextInput
                    label={t('discord.embed.description.label')}
                    description={t('discord.embed.description.description')}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedDescription')}
                  />

                  <TextInput
                    label={t('discord.embed.footer.label')}
                    description={t('discord.embed.footer.description')}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedFooter')}
                  />

                  <ColorInput
                    label={t('discord.embed.color.label')}
                    description={t('discord.embed.color.description')}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedColor')}
                  />

                  <Switch
                    label={t('discord.embed.timestamp.label')}
                    description={t('discord.embed.timestamp.description')}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedTimestamp', { type: 'checkbox' })}
                  />

                  <Switch
                    label={t('discord.embed.url.label')}
                    description={t('discord.embed.url.description')}
                    {...formOnShorten.getInputProps('discordOnShortenEmbedUrl', { type: 'checkbox' })}
                  />
                </SimpleGrid>
              </Paper>
            </Collapse>

            <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
              {t('common:actions.save')}
            </Button>
          </form>
        </Paper>
      </SimpleGrid>
    </>
  );
}
