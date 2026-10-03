import { useConfig } from '@/components/ConfigProvider';
import { Response } from '@/lib/api/response';
import { useUserStore } from '@/lib/client/store/user';
import { fetchApi } from '@/lib/fetchApi';
import { findProvider } from '@/lib/oauth/providers';
import { darken } from '@/lib/theme/color';
import type { OAuthProviderType } from '@/lib/db/enums';
import { Button, ButtonProps, Paper, SimpleGrid, Text, Title, useMantineTheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBrandDiscordFilled,
  IconBrandGithubFilled,
  IconBrandGoogleFilled,
  IconCheck,
  IconCircleKeyFilled,
  IconUserExclamation,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';

import styles from './index.module.css';

const icons = {
  DISCORD: <IconBrandDiscordFilled size='1rem' />,
  GITHUB: <IconBrandGithubFilled size='1rem' />,
  GOOGLE: <IconBrandGoogleFilled size='1rem' stroke={4} />,
  OIDC: <IconCircleKeyFilled size='1rem' />,
};

const names = {
  DISCORD: 'Discord',
  GITHUB: 'GitHub',
  GOOGLE: 'Google',
  OIDC: 'OpenID Connect',
};

function OAuthButton({ provider, linked }: { provider: OAuthProviderType; linked: boolean }) {
  const theme = useMantineTheme();
  const { t } = useTranslation('settings');

  const unlink = async () => {
    const { error } = await fetchApi<Response['/api/auth/oauth']>('/api/auth/oauth', 'DELETE', {
      provider,
    });

    if (error) {
      notifications.show({
        title: t('oauth.notifications.unlinkFailed.title'),
        message: error.error,
        color: 'red',
        icon: <IconUserExclamation size='1rem' />,
      });
    } else {
      notifications.show({
        title: t('oauth.notifications.unlinked.title'),
        message: t('oauth.notifications.unlinked.message', { provider: names[provider] }),
        color: 'green',
        icon: <IconCheck size='1rem' />,
      });

      mutate('/api/user');
    }
  };

  const baseProps: ButtonProps = {
    size: 'sm',
    leftSection: icons[provider],
    color: linked ? 'red' : `${provider.toLowerCase()}.0`,
    style: {
      '--z-bol-color': darken(theme.colors?.[provider.toLowerCase()]?.[0] ?? '', 0.2, theme),
    },
    className: !linked ? styles.button : undefined,
    styles: {
      label: {
        whiteSpace: 'normal',
        textAlign: 'center',
      },
    },
  };

  return linked ? (
    <Button {...baseProps} onClick={unlink}>
      {t('oauth.unlink', { provider: names[provider] })}
    </Button>
  ) : (
    <Button {...baseProps} component={'a'} href={`/api/auth/oauth/${provider.toLowerCase()}?state=link`}>
      {t('oauth.link', { provider: names[provider] })}
    </Button>
  );
}

export default function SettingsOAuth() {
  const config = useConfig();
  const { t } = useTranslation('settings');

  const user = useUserStore((state) => state.user);

  const discordLinked = findProvider('DISCORD', user?.oauthProviders ?? []);
  const githubLinked = findProvider('GITHUB', user?.oauthProviders ?? []);
  const googleLinked = findProvider('GOOGLE', user?.oauthProviders ?? []);
  const oidcLinked = findProvider('OIDC', user?.oauthProviders ?? []);

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>OAuth</Title>
      <Text size='sm' c='dimmed' mt={3}>
        {t('oauth.description')}
      </Text>

      <SimpleGrid mt='xs' cols={{ base: 1, md: 2 }} spacing='lg'>
        {config.oauthEnabled.discord && <OAuthButton provider='DISCORD' linked={!!discordLinked} />}
        {config.oauthEnabled.github && <OAuthButton provider='GITHUB' linked={!!githubLinked} />}
        {config.oauthEnabled.google && <OAuthButton provider='GOOGLE' linked={!!googleLinked} />}
        {config.oauthEnabled.oidc && <OAuthButton provider='OIDC' linked={!!oidcLinked} />}
      </SimpleGrid>
    </Paper>
  );
}
