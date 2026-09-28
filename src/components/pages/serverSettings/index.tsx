import { LinksList } from '@/components/LinksList';
import { Response } from '@/lib/api/response';
import { useTitle } from '@/lib/client/hooks/useTitle';
import {
  Accordion,
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Group,
  LoadingOverlay,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAdjustmentsHorizontalFilled,
  IconAppWindowFilled,
  IconArrowBack,
  IconAuth2fa,
  IconBrandDiscordFilled,
  IconClickFilled,
  IconClockPause,
  IconDatabase,
  IconFiles,
  IconHttpPost,
  IconKeyFilled,
  IconLayoutGrid,
  IconLink,
  IconSubtask,
  IconTagsFilled,
  IconVariable,
  IconWorldPlus,
} from '@tabler/icons-react';
import { lazy, Suspense, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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

function InvalidSettingsSection() {
  const { t } = useTranslation('serverSettings');

  return <Text>{t('invalidSection')}</Text>;
}

const SETTINGS_COMPONENTS = {
  core: {
    component: Core,
    nameKey: 'sections.core.name',
    key: 'core',
    descriptionKey: 'sections.core.description',
    Icon: IconDatabase,
  },
  chunks: {
    component: Chunks,
    nameKey: 'sections.chunks.name',
    key: 'chunks',
    descriptionKey: 'sections.chunks.description',
    Icon: IconLayoutGrid,
  },
  discord: {
    component: Discord,
    nameKey: 'sections.discord.name',
    key: 'discord',
    descriptionKey: 'sections.discord.description',
    Icon: IconBrandDiscordFilled,
  },
  domains: {
    component: Domains,
    nameKey: 'sections.domains.name',
    key: 'domains',
    descriptionKey: 'sections.domains.description',
    Icon: IconWorldPlus,
  },
  features: {
    component: Features,
    nameKey: 'sections.features.name',
    key: 'features',
    descriptionKey: 'sections.features.description',
    Icon: IconAdjustmentsHorizontalFilled,
  },
  files: {
    component: Files,
    nameKey: 'sections.files.name',
    key: 'files',
    descriptionKey: 'sections.files.description',
    Icon: IconFiles,
  },
  httpWebhook: {
    component: HttpWebhook,
    nameKey: 'sections.httpWebhook.name',
    key: 'httpWebhook',
    descriptionKey: 'sections.httpWebhook.description',
    Icon: IconHttpPost,
  },
  invites: {
    component: Invites,
    nameKey: 'sections.invites.name',
    key: 'invites',
    descriptionKey: 'sections.invites.description',
    Icon: IconTagsFilled,
  },
  mfa: {
    component: Mfa,
    nameKey: 'sections.mfa.name',
    key: 'mfa',
    descriptionKey: 'sections.mfa.description',
    Icon: IconAuth2fa,
  },
  oauth: {
    component: Oauth,
    nameKey: 'sections.oauth.name',
    key: 'oauth',
    descriptionKey: 'sections.oauth.description',
    Icon: IconKeyFilled,
  },
  pwa: {
    component: PWA,
    nameKey: 'sections.pwa.name',
    key: 'pwa',
    descriptionKey: 'sections.pwa.description',
    Icon: IconAppWindowFilled,
  },
  ratelimit: {
    component: Ratelimit,
    nameKey: 'sections.ratelimit.name',
    key: 'ratelimit',
    descriptionKey: 'sections.ratelimit.description',
    Icon: IconClockPause,
  },
  tasks: {
    component: Tasks,
    nameKey: 'sections.tasks.name',
    key: 'tasks',
    descriptionKey: 'sections.tasks.description',
    Icon: IconSubtask,
  },
  urls: {
    component: Urls,
    nameKey: 'sections.urls.name',
    key: 'urls',
    descriptionKey: 'sections.urls.description',
    Icon: IconLink,
  },
  website: {
    component: Website,
    nameKey: 'sections.website.name',
    key: 'website',
    descriptionKey: 'sections.website.description',
    Icon: IconClickFilled,
  },

  // placeholder
  settings: {
    component: null,
    nameKey: 'sections.settings.name',
    key: '',
    descriptionKey: null,
    Icon: null,
  },
} as const;

// labelKey / descriptionKey are keys in the 'serverSettings' namespace, translate them at render time
export const SETTINGS_EXTERNAL_LINKS = Object.values(SETTINGS_COMPONENTS).flatMap((setting) =>
  setting.component !== null && setting.descriptionKey !== null
    ? [
        {
          labelKey: setting.nameKey,
          descriptionKey: setting.descriptionKey,
          href: `/dashboard/admin/settings/${setting.key}`,
          icon: setting.Icon ? setting.Icon : IconAdjustmentsHorizontalFilled,
        },
      ]
    : [],
);

const SETTINGS_PART_KEYS = Object.keys(SETTINGS_COMPONENTS)
  .filter((key) => key !== 'settings')
  .sort((a, b) => b.length - a.length);

export default function DashboardServerSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('serverSettings');

  const { data } = useSWR<Response['/api/server/settings']>('/api/server/settings');

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
    (setting: string) => {
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

  const settingName = t(setting.nameKey);

  useTitle(settingName);

  return (
    <>
      <Group gap='sm' align='center' wrap='wrap'>
        {part !== 'settings' && (
          <ActionIcon component={Link} to='/dashboard/admin/settings' variant='outline'>
            <IconArrowBack size='1rem' />
          </ActionIcon>
        )}
        <Title order={1}>{settingName}</Title>
      </Group>

      {(data?.tampered?.length ?? 0) > 0 && (
        <Accordion variant='contained' radius='md' my='md'>
          <Accordion.Item value='environment-overrides'>
            <Accordion.Control
              icon={
                <ThemeIcon color='orange' variant='light' size='xl' radius='md'>
                  <IconVariable size='1.75rem' />
                </ThemeIcon>
              }
            >
              <Box miw={0}>
                <Group gap='xs'>
                  <Text fw={600}>{t('environmentOverrides.title')}</Text>
                  <Badge color='orange' variant='light' size='sm'>
                    {data!.tampered.length}
                  </Badge>
                </Group>
                <Text c='dimmed' size='sm'>
                  {t('environmentOverrides.description')}
                </Text>
              </Box>
            </Accordion.Control>

            <Accordion.Panel>
              <Group gap='xs' wrap='wrap'>
                {data!.tampered.map((setting) => (
                  <Anchor
                    key={setting}
                    component='button'
                    type='button'
                    onClick={() => onTamperedClick(setting)}
                    size='sm'
                  >
                    {setting}
                  </Anchor>
                ))}
              </Group>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
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
          <LinksList
            links={SETTINGS_EXTERNAL_LINKS.map(({ labelKey, descriptionKey, href, icon }) => ({
              label: t(labelKey),
              description: t(descriptionKey),
              href,
              icon,
            }))}
          />
        </Box>
      )}
    </>
  );
}
