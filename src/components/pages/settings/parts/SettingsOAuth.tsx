import { useConfig } from '@/components/ConfigProvider';
import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { findProvider } from '@/lib/oauth/providerUtil';
import { useUserStore } from '@/lib/store/user';
import { Button, Group, Paper, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { OAuthProviderType } from '@prisma/client';
import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandGoogle,
  IconCheck,
  IconCircleKeyFilled,
  IconUserExclamation,
} from '@tabler/icons-react';
import Link from 'next/link';
import { mutate } from 'swr';

const icons = {
  DISCORD: <IconBrandDiscordFilled />,
  GITHUB: <IconBrandGithubFilled />,
  GOOGLE: <IconBrandGoogle stroke={4} />,
  AUTHENTIK: <IconCircleKeyFilled />,
};

const names = {
  DISCORD: 'Discord',
  GITHUB: 'GitHub',
  GOOGLE: 'Google',
  AUTHENTIK: 'Authentik',
};

function OAuthButton({ provider, linked }: { provider: OAuthProviderType; linked: boolean }) {
  const unlink = async () => {
    const { error } = await fetchApi<Response['/api/auth/oauth']>('/api/auth/oauth', 'DELETE', {
      provider,
    });

    if (error) {
      notifications.show({
        title: 'Failed to unlink account',
        message: error.message,
        color: 'red',
        icon: <IconUserExclamation size='1rem' />,
      });
    } else {
      notifications.show({
        title: 'Account unlinked',
        message: `Your ${names[provider]} account has been unlinked.`,
        color: 'green',
        icon: <IconCheck size='1rem' />,
      });

      mutate('/api/user');
    }
  };

  const baseProps = {
    size: 'sm',
    leftIcon: icons[provider],
    color: linked ? 'red' : `${provider.toLowerCase()}.0`,
    sx: (t: any) => ({
      '&:hover': {
        ...(!linked && { backgroundColor: t.fn.darken(t.colors[provider.toLowerCase()][0], 0.2) }),
      },
    }),
  };

  return linked ? (
    <Button {...baseProps} onClick={unlink}>
      Unlink {names[provider]} account
    </Button>
  ) : (
    <Button {...baseProps} component={Link} href={`/api/auth/oauth/${provider.toLowerCase()}?state=link`}>
      Link {names[provider]} account
    </Button>
  );
}

export default function SettingsOAuth() {
  const config = useConfig();

  const user = useUserStore((state) => state.user);

  const discordLinked = findProvider('DISCORD', user?.oauthProviders ?? []);
  const githubLinked = findProvider('GITHUB', user?.oauthProviders ?? []);
  const googleLinked = findProvider('GOOGLE', user?.oauthProviders ?? []);
  const authentikLinked = findProvider('AUTHENTIK', user?.oauthProviders ?? []);

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>OAuth</Title>
      <Text size='sm' color='dimmed' mt={3}>
        Manage your connected OAuth providers.
      </Text>

      <Group mt='xs'>
        {config.oauthEnabled.discord && <OAuthButton provider='DISCORD' linked={!!discordLinked} />}
        {config.oauthEnabled.github && <OAuthButton provider='GITHUB' linked={!!githubLinked} />}
        {config.oauthEnabled.google && <OAuthButton provider='GOOGLE' linked={!!googleLinked} />}
        {config.oauthEnabled.authentik && <OAuthButton provider='AUTHENTIK' linked={!!authentikLinked} />}
      </Group>
    </Paper>
  );
}
