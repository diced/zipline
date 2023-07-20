import { useConfig } from '@/components/ConfigProvider';
import { findProvider } from '@/lib/oauth/providerUtil';
import { useSettingsStore } from '@/lib/store/settings';
import { useUserStore } from '@/lib/store/user';
import { Button, Group, Paper, Stack, Switch, Text, Title } from '@mantine/core';
import type { OAuthProviderType } from '@prisma/client';
import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandGoogle,
  IconCircleKeyFilled,
} from '@tabler/icons-react';
import Link from 'next/link';

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
  const unlink = async () => {};
  
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
    <Button {...baseProps} component={Link} href={`/api/auth/oauth/${provider.toLowerCase()}?link=true`}>
      Link {names[provider]} account
    </Button>
  );
}

export default function SettingsOAuth() {
  const config = useConfig();

  const [user, setUser] = useUserStore((state) => [state.user, state.setUser]);

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
