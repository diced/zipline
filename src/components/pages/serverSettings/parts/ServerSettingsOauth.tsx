import { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, Paper, SimpleGrid, Switch, TextInput, Title } from '@mantine/core';
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
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <Paper withBorder p='sm'>
            <Title order={4} mb='sm'>
              Discord
            </Title>

            <TextInput label='Discord Client ID' {...form.getInputProps('oauthDiscordClientId')} />
            <TextInput label='Discord Client Secret' {...form.getInputProps('oauthDiscordClientSecret')} />
            <TextInput
              label='Discord Redirect URL'
              description='The redirect URL to use instead of the host when logging in. This must end with /api/auth/oauth/discord'
              {...form.getInputProps('oauthDiscordRedirectUri')}
            />
          </Paper>
          <Paper withBorder p='sm'>
            <Title order={4} mb='sm'>
              Google
            </Title>

            <TextInput label='Google Client ID' {...form.getInputProps('oauthGoogleClientId')} />
            <TextInput label='Google Client Secret' {...form.getInputProps('oauthGoogleClientSecret')} />
            <TextInput
              label='Google Redirect URL'
              description='The redirect URL to use instead of the host when logging in. This must end with /api/auth/oauth/google'
              {...form.getInputProps('oauthGoogleRedirectUri')}
            />
          </Paper>
        </SimpleGrid>

        <Paper withBorder p='sm' my='md'>
          <Title order={4}>GitHub</Title>

          <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
            <TextInput label='GitHub Client ID' {...form.getInputProps('oauthGithubClientId')} />
            <TextInput label='GitHub Client Secret' {...form.getInputProps('oauthGithubClientSecret')} />
            <TextInput
              label='GitHub Redirect URL'
              description='The redirect URL to use instead of the host when logging in. This must end with /api/auth/oauth/github'
              {...form.getInputProps('oauthGithubRedirectUri')}
            />
          </SimpleGrid>
        </Paper>

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
              description='The redirect URL to use instead of the host when logging in. This must end with /api/auth/oauth/oidc'
              {...form.getInputProps('oauthOidcRedirectUri')}
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
