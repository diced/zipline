import type { Response } from '@/lib/api/response';
import {
  Anchor,
  Button,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function Oauth() {
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
      oauthBypassLocalLogin: data.settings.oauthBypassLocalLogin,
      oauthLoginOnly: data.settings.oauthLoginOnly,

      oauthDiscordClientId: data.settings.oauthDiscordClientId,
      oauthDiscordClientSecret: data.settings.oauthDiscordClientSecret,
      oauthDiscordRedirectUri: data.settings.oauthDiscordRedirectUri,
      oauthDiscordAllowedIds: data.settings.oauthDiscordAllowedIds.join(', '),
      oauthDiscordDeniedIds: data.settings.oauthDiscordDeniedIds.join(', '),

      oauthGoogleClientId: data.settings.oauthGoogleClientId,
      oauthGoogleClientSecret: data.settings.oauthGoogleClientSecret,
      oauthGoogleRedirectUri: data.settings.oauthGoogleRedirectUri,

      oauthGithubClientId: data.settings.oauthGithubClientId,
      oauthGithubClientSecret: data.settings.oauthGithubClientSecret,
      oauthGithubRedirectUri: data.settings.oauthGithubRedirectUri,

      oauthOidcClientId: data.settings.oauthOidcClientId,
      oauthOidcClientSecret: data.settings.oauthOidcClientSecret,
      oauthOidcAuthorizeUrl: data.settings.oauthOidcAuthorizeUrl,
      oauthOidcTokenUrl: data.settings.oauthOidcTokenUrl,
      oauthOidcUserinfoUrl: data.settings.oauthOidcUserinfoUrl,
      oauthOidcRedirectUri: data.settings.oauthOidcRedirectUri,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data.tampered.includes(payload.field) || false,
    }),
  });

  const onSubmit = async (values: typeof form.values) => {
    for (const key in values) {
      if (
        ![
          'oauthBypassLocalLogin',
          'oauthLoginOnly',
          'oauthDiscordAllowedIds',
          'oauthDiscordDeniedIds',
        ].includes(key)
      ) {
        if ((values[key as keyof typeof form.values] as string)?.trim() === '') {
          // @ts-ignore
          values[key as keyof typeof form.values] = null;
        } else {
          // @ts-ignore
          values[key as keyof typeof form.values] = (
            values[key as keyof typeof form.values] as string
          )?.trim();
        }
      }

      if (key === 'oauthDiscordAllowedIds' || key === 'oauthDiscordDeniedIds') {
        if (Array.isArray(values[key])) continue;

        // @ts-ignore
        values[key] = (values[key] as string)
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id !== '');
      }
    }

    return settingsOnSubmit(navigate, form)(values);
  };

  return (
    <>
      <Text size='sm' c='dimmed' mb='md'>
        <Trans
          t={t}
          i18nKey='oauth.intro'
          components={{ link: <Anchor component={Link} to='/dashboard/admin/settings/features' /> }}
        />
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap='lg'>
          <Switch
            label={t('oauth.bypassLocalLogin.label')}
            description={t('oauth.bypassLocalLogin.description')}
            {...form.getInputProps('oauthBypassLocalLogin', { type: 'checkbox' })}
          />

          <Switch
            label={t('oauth.loginOnly.label')}
            description={t('oauth.loginOnly.description')}
            {...form.getInputProps('oauthLoginOnly', { type: 'checkbox' })}
          />

          <Paper withBorder p='sm'>
            <Anchor href='https://discord.com/developers/applications' target='_blank'>
              <Title order={4} mb='sm'>
                Discord
              </Title>
            </Anchor>

            <TextInput
              label={t('oauth.provider.clientId', { provider: 'Discord' })}
              {...form.getInputProps('oauthDiscordClientId')}
            />
            <TextInput
              label={t('oauth.provider.clientSecret', { provider: 'Discord' })}
              {...form.getInputProps('oauthDiscordClientSecret')}
            />
            <TextInput
              label={t('oauth.discord.allowedIds.label')}
              description={t('oauth.discord.allowedIds.description')}
              {...form.getInputProps('oauthDiscordAllowedIds')}
            />
            <TextInput
              label={t('oauth.discord.deniedIds.label')}
              description={t('oauth.discord.deniedIds.description')}
              {...form.getInputProps('oauthDiscordDeniedIds')}
            />
            <TextInput
              label={t('oauth.provider.redirectUrl.label', { provider: 'Discord' })}
              description={t('oauth.provider.redirectUrl.description')}
              {...form.getInputProps('oauthDiscordRedirectUri')}
            />
          </Paper>

          <Paper withBorder p='sm'>
            <Anchor href='https://console.developers.google.com/' target='_blank'>
              <Title order={4} mb='sm'>
                Google
              </Title>
            </Anchor>

            <TextInput
              label={t('oauth.provider.clientId', { provider: 'Google' })}
              {...form.getInputProps('oauthGoogleClientId')}
            />
            <TextInput
              label={t('oauth.provider.clientSecret', { provider: 'Google' })}
              {...form.getInputProps('oauthGoogleClientSecret')}
            />
            <TextInput
              label={t('oauth.provider.redirectUrl.label', { provider: 'Google' })}
              description={t('oauth.provider.redirectUrl.description')}
              {...form.getInputProps('oauthGoogleRedirectUri')}
            />
          </Paper>

          <Paper withBorder p='sm'>
            <Anchor href='https://github.com/settings/developers' target='_blank'>
              <Title order={4} mb='sm'>
                GitHub
              </Title>
            </Anchor>

            <TextInput
              label={t('oauth.provider.clientId', { provider: 'GitHub' })}
              {...form.getInputProps('oauthGithubClientId')}
            />
            <TextInput
              label={t('oauth.provider.clientSecret', { provider: 'GitHub' })}
              {...form.getInputProps('oauthGithubClientSecret')}
            />
            <TextInput
              label={t('oauth.provider.redirectUrl.label', { provider: 'GitHub' })}
              description={t('oauth.provider.redirectUrl.description')}
              {...form.getInputProps('oauthGithubRedirectUri')}
            />
          </Paper>

          <Paper withBorder p='sm'>
            <Title order={4}>OpenID Connect</Title>

            <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
              <TextInput
                label={t('oauth.provider.clientId', { provider: 'OIDC' })}
                {...form.getInputProps('oauthOidcClientId')}
              />
              <TextInput
                label={t('oauth.provider.clientSecret', { provider: 'OIDC' })}
                {...form.getInputProps('oauthOidcClientSecret')}
              />
              <TextInput
                label={t('oauth.oidc.authorizeUrl')}
                {...form.getInputProps('oauthOidcAuthorizeUrl')}
              />
              <TextInput label={t('oauth.oidc.tokenUrl')} {...form.getInputProps('oauthOidcTokenUrl')} />
              <TextInput
                label={t('oauth.oidc.userinfoUrl')}
                {...form.getInputProps('oauthOidcUserinfoUrl')}
              />
              <TextInput
                label={t('oauth.provider.redirectUrl.label', { provider: 'OIDC' })}
                description={t('oauth.provider.redirectUrl.description')}
                {...form.getInputProps('oauthOidcRedirectUri')}
              />
            </SimpleGrid>
          </Paper>
        </Stack>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          {t('common:actions.save')}
        </Button>
      </form>
    </>
  );
}
