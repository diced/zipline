import { Response } from '@/lib/api/response';
import {
  Anchor,
  Button,
  LoadingOverlay,
  Paper,
  SimpleGrid,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';
import { EnvTooltip } from '..';

export default function ServerSettingsOauth({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      oauthBypassLocalLogin: false,
      oauthLoginOnly: false,

      oauthDiscordClientId: '',
      oauthDiscordClientSecret: '',
      oauthDiscordRedirectUri: '',

      oauthGoogleClientId: '',
      oauthGoogleClientSecret: '',
      oauthGoogleRedirectUri: '',

      oauthGithubClientId: '',
      oauthGithubClientSecret: '',
      oauthGithubRedirectUri: '',

      oauthOidcClientId: '',
      oauthOidcClientSecret: '',
      oauthOidcAuthorizeUrl: '',
      oauthOidcTokenUrl: '',
      oauthOidcUserinfoUrl: '',
      oauthOidcRedirectUri: '',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    for (const key in values) {
      if (!['oauthBypassLocalLogin', 'oauthLoginOnly'].includes(key)) {
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
    }

    return settingsOnSubmit(router, form)(values);
  };

  useEffect(() => {
    if (!data) return;

    form.setValues({
      oauthBypassLocalLogin: data?.oauthBypassLocalLogin ?? false,
      oauthLoginOnly: data?.oauthLoginOnly ?? false,

      oauthDiscordClientId: data?.oauthDiscordClientId ?? '',
      oauthDiscordClientSecret: data?.oauthDiscordClientSecret ?? '',
      oauthDiscordRedirectUri: data?.oauthDiscordRedirectUri ?? '',

      oauthGoogleClientId: data?.oauthGoogleClientId ?? '',
      oauthGoogleClientSecret: data?.oauthGoogleClientSecret ?? '',
      oauthGoogleRedirectUri: data?.oauthGoogleRedirectUri ?? '',

      oauthGithubClientId: data?.oauthGithubClientId ?? '',
      oauthGithubClientSecret: data?.oauthGithubClientSecret ?? '',
      oauthGithubRedirectUri: data?.oauthGithubRedirectUri ?? '',

      oauthOidcClientId: data?.oauthOidcClientId ?? '',
      oauthOidcClientSecret: data?.oauthOidcClientSecret ?? '',
      oauthOidcAuthorizeUrl: data?.oauthOidcAuthorizeUrl ?? '',
      oauthOidcTokenUrl: data?.oauthOidcTokenUrl ?? '',
      oauthOidcUserinfoUrl: data?.oauthOidcUserinfoUrl ?? '',
      oauthOidcRedirectUri: data?.oauthOidcRedirectUri ?? '',
    });
  }, [data]);

  return (
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>OAuth</Title>

      <Text size='sm' c='dimmed'>
        For OAuth to work, the &quot;OAuth Registration&quot; setting must be enabled in the Features section.
        If you have issues, try restarting Zipline after saving.
      </Text>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <EnvTooltip envVar='OAUTH_BYPASS_LOCAL_LOGIN' data={data} varKey='oauthBypassLocalLogin'>
            <Switch
              label='Bypass Local Login'
              description='Skips the local login page and redirects to the OAuth provider, this only works with one provider enabled.'
              {...form.getInputProps('oauthBypassLocalLogin', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='OAUTH_LOGIN_ONLY' data={data} varKey='oauthLoginOnly'>
            <Switch
              label='Login Only'
              description='Disables registration and only allows login with OAuth, existing users can link providers for example.'
              {...form.getInputProps('oauthLoginOnly', { type: 'checkbox' })}
            />
          </EnvTooltip>
        </SimpleGrid>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <Paper withBorder p='sm'>
            <Anchor href='https://discord.com/developers/applications' target='_blank'>
              <Title order={4} mb='sm'>
                Discord
              </Title>
            </Anchor>

            <EnvTooltip envVar='OAUTH_DISCORD_CLIENT_ID' data={data} varKey='oauthDiscordClientId'>
              <TextInput label='Discord Client ID' {...form.getInputProps('oauthDiscordClientId')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_DISCORD_CLIENT_SECRET' data={data} varKey='oauthDiscordClientSecret'>
              <TextInput label='Discord Client Secret' {...form.getInputProps('oauthDiscordClientSecret')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_DISCORD_REDIRECT_URI' data={data} varKey='oauthDiscordRedirectUri'>
              <TextInput
                label='Discord Redirect URL'
                description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
                {...form.getInputProps('oauthDiscordRedirectUri')}
              />
            </EnvTooltip>
          </Paper>
          <Paper withBorder p='sm'>
            <Anchor href='https://console.developers.google.com/' target='_blank'>
              <Title order={4} mb='sm'>
                Google
              </Title>
            </Anchor>

            <EnvTooltip envVar='OAUTH_GOOGLE_CLIENT_ID' data={data} varKey='oauthGoogleClientId'>
              <TextInput label='Google Client ID' {...form.getInputProps('oauthGoogleClientId')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_GOOGLE_CLIENT_SECRET' data={data} varKey='oauthGoogleClientSecret'>
              <TextInput label='Google Client Secret' {...form.getInputProps('oauthGoogleClientSecret')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_GOOGLE_REDIRECT_URI' data={data} varKey='oauthGoogleRedirectUri'>
              <TextInput
                label='Google Redirect URL'
                description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
                {...form.getInputProps('oauthGoogleRedirectUri')}
              />
            </EnvTooltip>
          </Paper>
        </SimpleGrid>

        <Paper withBorder p='sm' my='md'>
          <Anchor href='https://github.com/settings/developers' target='_blank'>
            <Title order={4} mb='sm'>
              GitHub
            </Title>
          </Anchor>

          <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
            <EnvTooltip envVar='OAUTH_GITHUB_CLIENT_ID' data={data} varKey='oauthGithubClientId'>
              <TextInput label='GitHub Client ID' {...form.getInputProps('oauthGithubClientId')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_GITHUB_CLIENT_SECRET' data={data} varKey='oauthGithubClientSecret'>
              <TextInput label='GitHub Client Secret' {...form.getInputProps('oauthGithubClientSecret')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_GITHUB_REDIRECT_URI' data={data} varKey='oauthGithubRedirectUri'>
              <TextInput
                label='GitHub Redirect URL'
                description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
                {...form.getInputProps('oauthGithubRedirectUri')}
              />
            </EnvTooltip>
          </SimpleGrid>
        </Paper>

        <Paper withBorder p='sm' my='md'>
          <Title order={4}>OpenID Connect</Title>

          <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
            <EnvTooltip envVar='OAUTH_OIDC_CLIENT_ID' data={data} varKey='oauthOidcClientId'>
              <TextInput label='OIDC Client ID' {...form.getInputProps('oauthOidcClientId')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_OIDC_CLIENT_SECRET' data={data} varKey='oauthOidcClientSecret'>
              <TextInput label='OIDC Client Secret' {...form.getInputProps('oauthOidcClientSecret')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_OIDC_AUTHORIZE_URL' data={data} varKey='oauthOidcAuthorizeUrl'>
              <TextInput label='OIDC Authorize URL' {...form.getInputProps('oauthOidcAuthorizeUrl')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_OIDC_TOKEN_URL' data={data} varKey='oauthOidcTokenUrl'>
              <TextInput label='OIDC Token URL' {...form.getInputProps('oauthOidcTokenUrl')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_OIDC_USERINFO_URL' data={data} varKey='oauthOidcUserinfoUrl'>
              <TextInput label='OIDC Userinfo URL' {...form.getInputProps('oauthOidcUserinfoUrl')} />
            </EnvTooltip>

            <EnvTooltip envVar='OAUTH_OIDC_REDIRECT_URI' data={data} varKey='oauthOidcRedirectUri'>
              <TextInput
                label='OIDC Redirect URL'
                description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
                {...form.getInputProps('oauthOidcRedirectUri')}
              />
            </EnvTooltip>
          </SimpleGrid>
        </Paper>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
