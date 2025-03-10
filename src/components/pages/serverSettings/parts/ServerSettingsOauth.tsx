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
          <Switch
            label='Bypass Local Login'
            description='Skips the local login page and redirects to the OAuth provider, this only works with one provider enabled.'
            disabled={data?.locked['oauthBypassLocalLogin']}
            {...form.getInputProps('oauthBypassLocalLogin', { type: 'checkbox' })}
          />

          <Switch
            label='Login Only'
            description='Disables registration and only allows login with OAuth, existing users can link providers for example.'
            disabled={data?.locked['oauthLoginOnly']}
            {...form.getInputProps('oauthLoginOnly', { type: 'checkbox' })}
          />
        </SimpleGrid>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <Paper withBorder p='sm'>
            <Anchor href='https://discord.com/developers/applications' target='_blank'>
              <Title order={4} mb='sm'>
                Discord
              </Title>
            </Anchor>

            <TextInput
              label='Discord Client ID'
              disabled={data?.locked['oauthDiscordClientId']}
              {...form.getInputProps('oauthDiscordClientId')}
            />
            <TextInput
              label='Discord Client Secret'
              disabled={data?.locked['oauthDiscordClientSecret']}
              {...form.getInputProps('oauthDiscordClientSecret')}
            />
            <TextInput
              label='Discord Redirect URL'
              description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
              disabled={data?.locked['oauthDiscordRedirectUri']}
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
              label='Google Client ID'
              disabled={data?.locked['oauthGoogleClientId']}
              {...form.getInputProps('oauthGoogleClientId')}
            />
            <TextInput
              label='Google Client Secret'
              disabled={data?.locked['oauthGoogleClientSecret']}
              {...form.getInputProps('oauthGoogleClientSecret')}
            />
            <TextInput
              label='Google Redirect URL'
              description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
              disabled={data?.locked['oauthGoogleRedirectUri']}
              {...form.getInputProps('oauthGoogleRedirectUri')}
            />
          </Paper>
        </SimpleGrid>

        <Paper withBorder p='sm' my='md'>
          <Anchor href='https://github.com/settings/developers' target='_blank'>
            <Title order={4} mb='sm'>
              GitHub
            </Title>
          </Anchor>

          <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
            <TextInput
              label='GitHub Client ID'
              disabled={data?.locked['oauthGithubClientId']}
              {...form.getInputProps('oauthGithubClientId')}
            />
            <TextInput
              label='GitHub Client Secret'
              disabled={data?.locked['oauthGithubClientSecret']}
              {...form.getInputProps('oauthGithubClientSecret')}
            />
            <TextInput
              label='GitHub Redirect URL'
              description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
              disabled={data?.locked['oauthGithubRedirectUri']}
              {...form.getInputProps('oauthGithubRedirectUri')}
            />
          </SimpleGrid>
        </Paper>

        <Paper withBorder p='sm' my='md'>
          <Title order={4}>OpenID Connect</Title>

          <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
            <TextInput
              label='OIDC Client ID'
              disabled={data?.locked['oauthOidcClientId']}
              {...form.getInputProps('oauthOidcClientId')}
            />
            <TextInput
              label='OIDC Client Secret'
              disabled={data?.locked['oauthOidcClientSecret']}
              {...form.getInputProps('oauthOidcClientSecret')}
            />
            <TextInput
              label='OIDC Authorize URL'
              disabled={data?.locked['oauthOidcAuthorizeUrl']}
              {...form.getInputProps('oauthOidcAuthorizeUrl')}
            />
            <TextInput
              label='OIDC Token URL'
              disabled={data?.locked['oauthOidcTokenUrl']}
              {...form.getInputProps('oauthOidcTokenUrl')}
            />
            <TextInput
              label='OIDC Userinfo URL'
              disabled={data?.locked['oauthOidcUserinfoUrl']}
              {...form.getInputProps('oauthOidcUserinfoUrl')}
            />
            <TextInput
              label='OIDC Redirect URL'
              description='The redirect URL to use instead of the host when logging in. This is not required if the URL generated by Zipline works as intended.'
              disabled={data?.locked['oauthOidcRedirectUri']}
              {...form.getInputProps('oauthOidcRedirectUri')}
            />
          </SimpleGrid>
        </Paper>

        <Button
          type='submit'
          mt='md'
          loading={isLoading}
          disabled={
            data?.locked['oauthBypassLocalLogin'] &&
            data?.locked['oauthLoginOnly'] &&
            data?.locked['oauthDiscordClientId'] &&
            data?.locked['oauthDiscordClientSecret'] &&
            data?.locked['oauthDiscordRedirectUri'] &&
            data?.locked['oauthGoogleClientId'] &&
            data?.locked['oauthGoogleClientSecret'] &&
            data?.locked['oauthGoogleRedirectUri'] &&
            data?.locked['oauthGithubClientId'] &&
            data?.locked['oauthGithubClientSecret'] &&
            data?.locked['oauthGithubRedirectUri'] &&
            data?.locked['oauthOidcClientId'] &&
            data?.locked['oauthOidcClientSecret'] &&
            data?.locked['oauthOidcAuthorizeUrl'] &&
            data?.locked['oauthOidcTokenUrl'] &&
            data?.locked['oauthOidcUserinfoUrl'] &&
            data?.locked['oauthOidcRedirectUri']
          }
          leftSection={<IconDeviceFloppy size='1rem' />}
        >
          Save
        </Button>
      </form>
    </Paper>
  );
}
