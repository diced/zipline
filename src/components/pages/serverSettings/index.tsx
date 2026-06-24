import { LinksList } from '@/components/LinksList';
import { Response } from '@/lib/api/response';
import { useTitle } from '@/lib/client/hooks/useTitle';
import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Collapse,
  Group,
  LoadingOverlay,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAdjustmentsHorizontalFilled,
  IconAppWindowFilled,
  IconArrowBack,
  IconAuth2fa,
  IconBrandDiscordFilled,
  IconClickFilled,
  IconClockPause,
  IconDatabase,
  IconExclamationMark,
  IconFiles,
  IconHttpPost,
  IconKeyFilled,
  IconLayoutGrid,
  IconLink,
  IconSubtask,
  IconTagsFilled,
  IconWorldPlus,
} from '@tabler/icons-react';
import { lazy, Suspense, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useSWR from 'swr';

const Core = lazy(() => import('./parts/Core'));
const Chunks = lazy(() => import('./parts/Chunks'));
const Discord = lazy(() => import('./parts/Discord'));
const Domains = lazy(() => import('./parts/Domains'));
const Features = lazy(() => import('./parts/Features'));
const Files = lazy(() => import('./parts/Files'));
const HttpWebhook = lazy(() => import('./parts/HttpWebhook'));
const Invites = lazy(() => import('./parts/Invites'));
const Mfa = lazy(() => import('./parts/Mfa'));
const Oauth = lazy(() => import('./parts/Oauth'));
const PWA = lazy(() => import('./parts/PWA'));
const Ratelimit = lazy(() => import('./parts/Ratelimit'));
const Tasks = lazy(() => import('./parts/Tasks'));
const Urls = lazy(() => import('./parts/Urls'));
const Website = lazy(() => import('./parts/Website'));

const InvalidSettingsSection = () => <Text>Invalid settings section</Text>;

const SETTINGS_COMPONENTS = {
  core: {
    component: Core,
    name: 'Core',
    key: 'core',
    desc: 'General server settings',
    Icon: IconDatabase,
  },
  chunks: {
    component: Chunks,
    name: 'Chunks',
    key: 'chunks',
    desc: 'Partial uploading',
    Icon: IconLayoutGrid,
  },
  discord: {
    component: Discord,
    name: 'Discord',
    key: 'discord',
    desc: 'Discord webhook integration',
    Icon: IconBrandDiscordFilled,
  },
  domains: {
    component: Domains,
    name: 'Domains',
    key: 'domains',
    desc: 'Add custom domains',
    Icon: IconWorldPlus,
  },
  features: {
    component: Features,
    name: 'Features',
    key: 'features',
    desc: 'Configure various features',
    Icon: IconAdjustmentsHorizontalFilled,
  },
  files: {
    component: Files,
    name: 'Files',
    key: 'files',
    desc: 'File uploading settings',
    Icon: IconFiles,
  },
  httpWebhook: {
    component: HttpWebhook,
    name: 'HTTP Webhook',
    key: 'httpWebhook',
    desc: 'Send POST requests to a URL on certain events',
    Icon: IconHttpPost,
  },
  invites: {
    component: Invites,
    name: 'Invites',
    key: 'invites',
    desc: 'Invite settings',
    Icon: IconTagsFilled,
  },
  mfa: {
    component: Mfa,
    name: 'Multi-Factor Authentication',
    key: 'mfa',
    desc: 'Enable or disable passkeys and TOTP authentication',
    Icon: IconAuth2fa,
  },
  oauth: {
    component: Oauth,
    name: 'OAuth',
    key: 'oauth',
    desc: 'Configure OAuth providers for authentication',
    Icon: IconKeyFilled,
  },
  pwa: {
    component: PWA,
    name: 'PWA',
    key: 'pwa',
    desc: 'Progressive Web App settings',
    Icon: IconAppWindowFilled,
  },
  ratelimit: {
    component: Ratelimit,
    name: 'Rate Limit',
    key: 'ratelimit',
    desc: 'Configure API rate limits',
    Icon: IconClockPause,
  },
  tasks: {
    component: Tasks,
    name: 'Tasks',
    key: 'tasks',
    desc: 'Background task intervals',
    Icon: IconSubtask,
  },
  urls: {
    component: Urls,
    name: 'URL Shortening',
    key: 'urls',
    desc: 'Configure URL shortening settings',
    Icon: IconLink,
  },
  website: {
    component: Website,
    name: 'Website',
    key: 'website',
    desc: 'Website related settings like title and description',
    Icon: IconClickFilled,
  },

  // placeholder
  settings: {
    component: null,
    name: 'Server Settings',
    key: '',
    desc: '',
    Icon: null,
  },
};

export const SETTINGS_EXTERNAL_LINKS = Object.values(SETTINGS_COMPONENTS)
  .filter((setting) => setting.component !== null)
  .map((setting) => ({
    label: setting.name,
    description: setting.desc,
    href: `/dashboard/admin/settings/${setting.key}`,
    icon: setting.Icon ? setting.Icon : IconAdjustmentsHorizontalFilled,
  }));

const SETTINGS_PART_KEYS = Object.keys(SETTINGS_COMPONENTS)
  .filter((key) => key !== 'settings')
  .sort((a, b) => b.length - a.length);

export default function DashboardServerSettings() {
  const location = useLocation();
  const navigate = useNavigate();

  const { data } = useSWR<Response['/api/server/settings']>('/api/server/settings');
  const [opened, { toggle }] = useDisclosure(false);

  const toSettingSection = useCallback((settingKey: string) => {
    const normalizedSetting = settingKey.toLowerCase();
    const matched = SETTINGS_PART_KEYS.find((key) => normalizedSetting.startsWith(key.toLowerCase()));

    return matched ?? 'settings';
  }, []);

  const scrollToSetting = useCallback((setting: string) => {
    const input = document.querySelector<HTMLElement>(`[data-path="${setting}"]`);
    const parent = input?.parentElement?.parentElement;
    if (!input || !parent) return false;

    parent.style.transition = 'all 0.4s ease';
    parent.style.borderRadius = 'var(--mantine-radius-xs)';
    parent.style.outline = '2px solid var(--mantine-primary-color-filled)';
    parent.style.outlineOffset = 'var(--mantine-spacing-xs)';

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length === 0) return;
        if (!entries[0].isIntersecting) return;

        observer.disconnect();
        setTimeout(() => {
          parent.style.outline = '0 solid transparent';
          parent.style.outlineOffset = '0';
          parent.style.borderRadius = '0';
        }, 2000);
      },
      { threshold: 1.0 },
    );
    observer.observe(input);

    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus();

    return true;
  }, []);

  const scrollToSettingWithRetry = useCallback(
    (setting: string, attemptsLeft = 18) => {
      const tryScroll = (remainingAttempts: number) => {
        if (scrollToSetting(setting)) return;
        if (remainingAttempts <= 0) return;

        window.setTimeout(() => tryScroll(remainingAttempts - 1), 80);
      };

      tryScroll(attemptsLeft);
    },
    [scrollToSetting],
  );

  const onTamperedClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, setting: string) => {
      e.preventDefault();

      const section = toSettingSection(setting);
      const url = `/dashboard/admin/settings/${section}`;

      if (location.pathname === url) return scrollToSettingWithRetry(setting);

      navigate(url);
      setTimeout(() => {
        scrollToSettingWithRetry(setting);
      }, 0);
    },
    [location.pathname, navigate, scrollToSettingWithRetry, toSettingSection],
  );

  const pathPart = location.pathname.split('/')[4];
  let part = 'settings';
  if (pathPart && SETTINGS_COMPONENTS[pathPart as keyof typeof SETTINGS_COMPONENTS]) {
    part = pathPart;
  }

  const setting = SETTINGS_COMPONENTS[part as keyof typeof SETTINGS_COMPONENTS];
  const SettingsComponent = setting.component ?? InvalidSettingsSection;

  useTitle(setting.name);

  return (
    <>
      <Group gap='sm' align='center' wrap='wrap'>
        {part !== 'settings' && (
          <ActionIcon component={Link} to='/dashboard/admin/settings' variant='outline'>
            <IconArrowBack size='1rem' />
          </ActionIcon>
        )}
        <Title order={1}>{setting.name}</Title>

        {(data?.tampered?.length ?? 0) > 0 && (
          <Button
            variant='outline'
            color={opened ? 'red' : 'blue'}
            size='xs'
            onClick={toggle}
            leftSection={<IconExclamationMark size='1rem' />}
          >
            {opened ? 'Hide' : 'Show'} Tampered ({data!.tampered.length})
          </Button>
        )}
      </Group>

      {(data?.tampered?.length ?? 0) > 0 && (
        <Collapse expanded={opened} transitionDuration={180}>
          <Alert
            my='md'
            color='red'
            title='Environment Variable Settings'
            icon={<IconExclamationMark size='1rem' />}
            variant='outline'
          >
            <Text size='sm' mb='xs'>
              These settings are controlled by environment variables:
            </Text>
            <Group gap='xs'>
              {data!.tampered.map((setting) => (
                <Anchor key={setting} onClick={(e) => onTamperedClick(e, setting)} size='sm'>
                  {setting}
                </Anchor>
              ))}
            </Group>
          </Alert>
        </Collapse>
      )}

      {part !== 'settings' ? (
        <Box my='sm' p='xs' pos='relative' bdrs='lg'>
          <Suspense
            fallback={
              <Box h={400} pos='relative'>
                <LoadingOverlay visible bdrs='md' />
              </Box>
            }
          >
            <SettingsComponent />
          </Suspense>
        </Box>
      ) : (
        <Box my='sm'>
          <LinksList links={SETTINGS_EXTERNAL_LINKS} />
        </Box>
      )}
    </>
  );
}
