import { Response } from '@/lib/api/response';
import { Invite } from '@/lib/db/models/invite';
import { Center, Group, LoadingOverlay, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';
import useSWR from 'swr';
import InviteCard from '../InviteCard';

export default function InviteGridView() {
  const { data: folders, isLoading } =
    useSWR<Extract<Response['/api/auth/invites'], Invite[]>>('/api/auth/invites');

  return (
    <>
      {isLoading ? (
        <Paper withBorder h={200}>
          <LoadingOverlay visible />
        </Paper>
      ) : folders?.length ?? 0 !== 0 ? (
        <SimpleGrid
          my='sm'
          spacing='md'
          cols={4}
          breakpoints={[
            { maxWidth: 'sm', cols: 1 },
            { maxWidth: 'md', cols: 2 },
          ]}
          pos='relative'
        >
          {folders?.map((invite) => (
            <InviteCard key={invite.id} invite={invite} />
          ))}
        </SimpleGrid>
      ) : (
        <Paper withBorder p='sm' my='sm'>
          <Center>
            <Stack>
              <Group>
                <IconLink size='2rem' />
                <Title order={2}>No invites found</Title>
              </Group>
              <Text size='sm' color='dimmed'>
                Create an invite to see them here.
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </>
  );
}
