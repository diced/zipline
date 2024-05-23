import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { Center, Group, LoadingOverlay, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';
import useSWR from 'swr';
import FolderCard from '../FolderCard';

export default function FolderGridView() {
  const { data: folders, isLoading } =
    useSWR<Extract<Response['/api/user/folders'], Folder[]>>('/api/user/folders');

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
          cols={{
            base: 1,
            md: 2,
            lg: 4,
          }}
          pos='relative'
        >
          {folders?.map((folder) => <FolderCard key={folder.id} folder={folder} />)}
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
