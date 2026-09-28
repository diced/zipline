import { LimitedUser } from '@/lib/db/models/user';
import { Center, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconFilesOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import UserCard from '../UserCard';

export default function UserGridView() {
  const { t } = useTranslation('users');
  const { data: users, isLoading } = useSWR<LimitedUser[]>('/api/users?noincl=true');

  return (
    <>
      {isLoading ? (
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
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height={120} animate />
          ))}
        </SimpleGrid>
      ) : (users?.length ?? 0 !== 0) ? (
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
          {users?.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </SimpleGrid>
      ) : (
        <Paper withBorder p='sm' my='sm'>
          <Center>
            <Stack>
              <Group>
                <IconFilesOff size='2rem' />
                <Title order={2}>{t('grid.empty.title')}</Title>
              </Group>
              <Text size='sm' c='dimmed'>
                {t('grid.empty.description')}
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </>
  );
}
