import { Response } from '@/lib/api/response';
import { Group, SimpleGrid, Stack, Title } from '@mantine/core';
import useSWR from 'swr';
import ServerSettingsChunks from './parts/ServerSettingsChunks';
import ServerSettingsCore from './parts/ServerSettingsCore';
import ServerSettingsDiscord from './parts/ServerSettingsDiscord';
import ServerSettingsFeatures from './parts/ServerSettingsFeatures';
import ServerSettingsFiles from './parts/ServerSettingsFiles';
import ServerSettingsHttpWebhook from './parts/ServerSettingsHttpWebhook';
import ServerSettingsInvites from './parts/ServerSettingsInvites';
import ServerSettingsMfa from './parts/ServerSettingsMfa';
import ServerSettingsOauth from './parts/ServerSettingsOauth';
import ServerSettingsRatelimit from './parts/ServerSettingsRatelimit';
import ServerSettingsTasks from './parts/ServerSettingsTasks';
import ServerSettingsUrls from './parts/ServerSettingsUrls';
import ServerSettingsWebsite from './parts/ServerSettingsWebsite';

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
          </>
        )}
      </SimpleGrid>

      <Stack mt='md' gap='md'>
        {error ? (
          <div>Error loading server settings</div>
        ) : (
          <>
            <ServerSettingsHttpWebhook swr={{ data, isLoading }} />

            <ServerSettingsDiscord swr={{ data, isLoading }} />
          </>
        )}
      </Stack>
    </>
  );
}
