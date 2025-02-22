import { Response } from '@/lib/api/response';
import { Group, SimpleGrid, Skeleton, Stack, Title } from '@mantine/core';
import useSWR from 'swr';
import dynamic from 'next/dynamic';

function SettingsSkeleton() {
  return <Skeleton height={280} animate />;
}

const ServerSettingsCore = dynamic(() => import('./parts/ServerSettingsCore'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsChunks = dynamic(() => import('./parts/ServerSettingsChunks'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsDiscord = dynamic(() => import('./parts/ServerSettingsDiscord'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsFeatures = dynamic(() => import('./parts/ServerSettingsFeatures'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsFiles = dynamic(() => import('./parts/ServerSettingsFiles'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsHttpWebhook = dynamic(() => import('./parts/ServerSettingsHttpWebhook'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsInvites = dynamic(() => import('./parts/ServerSettingsInvites'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsMfa = dynamic(() => import('./parts/ServerSettingsMfa'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsOauth = dynamic(() => import('./parts/ServerSettingsOauth'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsRatelimit = dynamic(() => import('./parts/ServerSettingsRatelimit'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsTasks = dynamic(() => import('./parts/ServerSettingsTasks'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsUrls = dynamic(() => import('./parts/ServerSettingsUrls'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsWebsite = dynamic(() => import('./parts/ServerSettingsWebsite'), {
  loading: () => <SettingsSkeleton />,
});
const ServerSettingsPWA = dynamic(() => import('./parts/ServerSettingsPWA'), {
  loading: () => <SettingsSkeleton />,
});

export default function DashboardSettings() {
  const { data, isLoading, error } = useSWR<Response['/api/server/settings']>('/api/server/settings');

  return (
    <>
      <Group gap='sm'>
        <Title order={1}>Server Settings</Title>
      </Group>

      <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
        {error ? (
          <div>Error loading server settings</div>
        ) : (
          <>
            <ServerSettingsCore swr={{ data, isLoading }} />
            <ServerSettingsChunks swr={{ data, isLoading }} />
            <ServerSettingsTasks swr={{ data, isLoading }} />
            <ServerSettingsMfa swr={{ data, isLoading }} />

            <ServerSettingsFeatures swr={{ data, isLoading }} />
            <ServerSettingsFiles swr={{ data, isLoading }} />
            <Stack>
              <ServerSettingsUrls swr={{ data, isLoading }} />
              <ServerSettingsInvites swr={{ data, isLoading }} />
            </Stack>

            <ServerSettingsRatelimit swr={{ data, isLoading }} />
            <ServerSettingsWebsite swr={{ data, isLoading }} />
            <ServerSettingsOauth swr={{ data, isLoading }} />

            <ServerSettingsPWA swr={{ data, isLoading }} />

            <ServerSettingsHttpWebhook swr={{ data, isLoading }} />
          </>
        )}
      </SimpleGrid>

      <Stack mt='md' gap='md'>
        {error ? null : <ServerSettingsDiscord swr={{ data, isLoading }} />}
      </Stack>
    </>
  );
}
