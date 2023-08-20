import { Response } from '@/lib/api/response';
import { User } from '@/lib/db/models/user';
import { Center, Group, LoadingOverlay, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconFilesOff } from '@tabler/icons-react';
import useSWR from 'swr';
import UserCard from '../UserCard';

export default function UserGridView() {
  const { data: users, isLoading } =
    useSWR<Extract<Response['/api/users'], User[]>>('/api/users?noincl=true');

  return (
    <>
      {isLoading ? (
        <Paper withBorder h={200}>
          <LoadingOverlay visible />
        </Paper>
      ) : users?.length ?? 0 !== 0 ? (
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
          {users?.map((user) => <UserCard key={user.id} user={user} />)}
        </SimpleGrid>
      ) : (
        <Paper withBorder p='sm' my='sm'>
          <Center>
            <Stack>
              <Group>
                <IconFilesOff size='2rem' />
                <Title order={2}>No users found</Title>
              </Group>
              <Text size='sm' color='dimmed'>
                Create a user to see them here
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </>
  );
}
