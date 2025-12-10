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
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function Oauth({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      oauthBypassLocalLogin: false,
      oauthLoginOnly: false,

      oauthDiscordClientId: '',
      oauthDiscordClientSecret: '',
      oauthDiscordRedirectUri: '',
      oauthDiscordAllowedIds: '',
      oauthDiscordDeniedIds: '',

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
      oauthOidcScopeOpenid: true,
      oauthOidcScopeProfile: true,
      oauthOidcScopeEmail: true,
      oauthOidcScopeOfflineAccess: true,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data?.tampered?.includes(payload.field) || false,
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
          'oauthOidcScopeOpenid',
          'oauthOidcScopeProfile',
          'oauthOidcScopeEmail',
          'oauthOidcScopeOfflineAccess',
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

  useEffect(() => {
    if (!data) return;

    form.setValues({
      oauthBypassLocalLogin: data.settings.oauthBypassLocalLogin ?? false,
      oauthLoginOnly: data.settings.oauthLoginOnly ?? false,

      oauthDiscordClientId: data.settings.oauthDiscordClientId ?? '',
      oauthDiscordClientSecret: data.settings.oauthDiscordClientSecret ?? '',
      oauthDiscordRedirectUri: data.settings.oauthDiscordRedirectUri ?? '',
      oauthDiscordAllowedIds: data.settings.oauthDiscordAllowedIds
        ? data.settings.oauthDiscordAllowedIds.join(', ')
        : '',
      oauthDiscordDeniedIds: data.settings.oauthDiscordDeniedIds
        ? data.settings.oauthDiscordDeniedIds.join(', ')
        : '',

      oauthGoogleClientId: data.settings.oauthGoogleClientId ?? '',
      oauthGoogleClientSecret: data.settings.oauthGoogleClientSecret ?? '',
      oauthGoogleRedirectUri: data.settings.oauthGoogleRedirectUri ?? '',

      oauthGithubClientId: data.settings.oauthGithubClientId ?? '',
      oauthGithubClientSecret: data.settings.oauthGithubClientSecret ?? '',
      oauthGithubRedirectUri: data.settings.oauthGithubRedirectUri ?? '',

      oauthOidcClientId: data.settings.oauthOidcClientId ?? '',
      oauthOidcClientSecret: data.settings.oauthOidcClientSecret ?? '',
      oauthOidcAuthorizeUrl: data.settings.oauthOidcAuthorizeUrl ?? '',
      oauthOidcTokenUrl: data.settings.oauthOidcTokenUrl ?? '',
      oauthOidcUserinfoUrl: data.settings.oauthOidcUserinfoUrl ?? '',
      oauthOidcRedirectUri: data.settings.oauthOidcRedirectUri ?? '',
      oauthOidcScopeOpenid: data.settings.oauthOidcScopeOpenid ?? true,
      oauthOidcScopeProfile: data.settings.oauthOidcScopeProfile ?? true,
      oauthOidcScopeEmail: data.settings.oauthOidcScopeEmail ?? true,
      oauthOidcScopeOfflineAccess: data.settings.oauthOidcScopeOfflineAccess ?? true,
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
          <Switch
            label='Bypass Local Login'
            description='Skips the local login page and redirects to the OAuth provider, this only works with one provider enabled.'
            {...form.getInputProps('oauthBypassLocalLogin', { type: 'checkbox' })}
          />

          <Switch
            label='Login Only'
            description='Disables registration and only allows login with OAuth, existing users can link providers for example.'
            {...form.getInputProps('oauthLoginOnly', { type: 'checkbox' })}
          />
        </SimpleGrid>

        <Paper withBorder p='sm' my='sm'>
          <Anchor href='https://discord.com/developers/applications' target='_blank'>
            <Title order={4} mb='sm'>
              Discord
            </Title>
          </Anchor>

          <TextInput label='Discord Client ID' {...form.getInputProps('oauthDiscordClientId')} />
          <TextInput label='Discord Client Secret' {...form.getInputProps('oauthDiscordClientSecret')} />
          <TextInput
            label='Discord Allowed IDs'
            description='A comma-separated list of Discord user IDs that are allowed to log in. Leave empty to disable allow list.'
            {...form.getInputProps('oauthDiscordAllowedIds')}
          />
          <TextInput
            label='Discord Denied IDs'
            description='A comma-separated list of Discord user IDs that are denied from logging in. Leave empty to disable deny list.'
            {...form.getInputProps('oauthDiscordDeniedIds')}
          />
          <TextInput
            label='Discord Redirect URL'
            description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
            {...form.getInputProps('oauthDiscordRedirectUri')}
          />
        </Paper>

        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <Paper withBorder p='sm'>
            <Anchor href='https://console.developers.google.com/' target='_blank'>
              <Title order={4} mb='sm'>
                Google
              </Title>
            </Anchor>

            <TextInput label='Google Client ID' {...form.getInputProps('oauthGoogleClientId')} />
            <TextInput label='Google Client Secret' {...form.getInputProps('oauthGoogleClientSecret')} />
            <TextInput
              label='Google Redirect URL'
              description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
              {...form.getInputProps('oauthGoogleRedirectUri')}
            />
          </Paper>

          <Paper withBorder p='sm'>
            <Anchor href='https://github.com/settings/developers' target='_blank'>
              <Title order={4} mb='sm'>
                GitHub
              </Title>
            </Anchor>

            <TextInput label='GitHub Client ID' {...form.getInputProps('oauthGithubClientId')} />
            <TextInput label='GitHub Client Secret' {...form.getInputProps('oauthGithubClientSecret')} />
            <TextInput
              label='GitHub Redirect URL'
              description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
              {...form.getInputProps('oauthGithubRedirectUri')}
            />
          </Paper>
        </SimpleGrid>

        <Paper withBorder p='sm' my='md'>
          <Title order={4}>OpenID Connect</Title>

          <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
            <TextInput label='OIDC Client ID' {...form.getInputProps('oauthOidcClientId')} />
            <TextInput label='OIDC Client Secret' {...form.getInputProps('oauthOidcClientSecret')} />
            <TextInput label='OIDC Authorize URL' {...form.getInputProps('oauthOidcAuthorizeUrl')} />
            <TextInput label='OIDC Token URL' {...form.getInputProps('oauthOidcTokenUrl')} />
            <TextInput label='OIDC Userinfo URL' {...form.getInputProps('oauthOidcUserinfoUrl')} />
            <TextInput
              label='OIDC Redirect URL'
              description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
              {...form.getInputProps('oauthOidcRedirectUri')}
            />
          </SimpleGrid>

          <Title order={5} mt='md' mb='sm'>
            OpenID Scopes
          </Title>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing='lg'>
            <Switch
              label='OpenID'
              description='Request the openid scope (required for OpenID Connect)'
              {...form.getInputProps('oauthOidcScopeOpenid', { type: 'checkbox' })}
            />
            <Switch
              label='Profile'
              description='Request the profile scope to access user profile information'
              {...form.getInputProps('oauthOidcScopeProfile', { type: 'checkbox' })}
            />
            <Switch
              label='Email'
              description='Request the email scope to access user email address'
              {...form.getInputProps('oauthOidcScopeEmail', { type: 'checkbox' })}
            />
            <Switch
              label='Offline Access'
              description='Request the offline_access scope to get a refresh token'
              {...form.getInputProps('oauthOidcScopeOfflineAccess', { type: 'checkbox' })}
            />
          </SimpleGrid>
        </Paper>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
