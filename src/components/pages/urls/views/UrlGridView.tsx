import { Response } from '@/lib/api/response';
import type { Url } from '@/lib/db/models/url';
import { Center, Group, LoadingOverlay, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';
import useSWR from 'swr';
import UrlCard from '../UrlCard';

export default function UrlGridView() {
  const { data: urls, isLoading } = useSWR<Extract<Response['/api/user/urls'], Url[]>>('/api/user/urls');

  return (
    <>
      {isLoading ? (
        <Paper withBorder h={200}>
          <LoadingOverlay visible />
        </Paper>
      ) : urls?.length ?? 0 !== 0 ? (
        <SimpleGrid
          my='sm'
          spacing='md'
          cols={{
            base: 1,
            md: 2,
            lg: 4,
          }}
          pos='relative'
        >
          {urls?.map((url) => <UrlCard key={url.id} url={url} />)}
        </SimpleGrid>
      ) : (
        <Paper withBorder p='sm' my='sm'>
          <Center>
            <Stack>
              <Group>
                <IconLink size='2rem' />
                <Title order={2}>No URLs found</Title>
              </Group>
              <Text size='sm' c='dimmed'>
                Shorten a URL to see them here
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </>
  );
}
