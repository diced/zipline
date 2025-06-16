import { Folder } from '@/lib/db/models/folder';
import { Center, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';
import useSWR from 'swr';
import FolderCard from '../FolderCard';

export default function FolderGridView() {
  const { data: folders, isLoading } = useSWR<Folder[]>('/api/user/folders');

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
      ) : (folders?.length ?? 0 !== 0) ? (
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
          {folders?.map((folder: Folder) => <FolderCard key={folder.id} folder={folder} />)}
        </SimpleGrid>
      ) : (
        <Paper withBorder p='sm' my='sm'>
          <Center>
            <Stack>
              <Group>
                <IconLink size='2rem' />
                <Title order={2}>No Folders found</Title>
              </Group>
              <Text size='sm' c='dimmed'>
                Create a folder to see it here
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </>
  );
}
