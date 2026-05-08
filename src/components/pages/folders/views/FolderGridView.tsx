import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { Center, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconFolder } from '@tabler/icons-react';
import useSWR from 'swr';
import FolderCard from '../FolderCard';

export default function FolderGridView({
  currentFolderId,
  onNavigate,
}: {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}) {
  const queryParam = currentFolderId ? `?parentId=${currentFolderId}&noincl=true` : '?root=true&noincl=true';
  const { data: folders, isLoading } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>(
    `/api/user/folders${queryParam}`,
  );

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
      ) : (folders?.length ?? 0) !== 0 ? (
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
          {folders?.map((folder) => (
            <FolderCard key={folder.id} folder={folder} onNavigate={onNavigate} />
          ))}
        </SimpleGrid>
      ) : (
        <Paper withBorder p='sm' my='sm'>
          <Center>
            <Stack>
              <Group>
                <IconFolder size='2rem' />
                <Title order={2}>No Folders found</Title>
              </Group>
              <Text size='sm' c='dimmed'>
                {currentFolderId ? 'This folder is empty' : 'Create a folder to see it here'}
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </>
  );
}
