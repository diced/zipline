import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import useSWR from 'swr';
import FolderCard from '../FolderCard';
import { Paper, LoadingOverlay, SimpleGrid, Center, Stack, Group, Title, Text } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';
import urls from '../../urls';

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
          cols={4}
          breakpoints={[
            { maxWidth: 'sm', cols: 1 },
            { maxWidth: 'md', cols: 2 },
          ]}
          pos='relative'
        >
          {folders?.map((folder) => (
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </SimpleGrid>
      ) : (
        <Paper withBorder p='sm' my='sm'>
          <Center>
            <Stack>
              <Group>
                <IconLink size='2rem' />
                <Title order={2}>No Folders found</Title>
              </Group>
              <Text size='sm' color='dimmed'>
                Create a folder to see it here
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </>
  );
}
