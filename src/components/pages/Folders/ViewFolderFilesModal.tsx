import { Center, Modal, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import File from 'components/File';
import MutedText from 'components/MutedText';
import { useFolder } from 'lib/queries/folders';

export default function ViewFolderFilesModal({ open, setOpen, folderId, disableMediaPreview, exifEnabled }) {
  if (!folderId) return null;

  const folder = useFolder(folderId, true);

  return (
    <Modal
      opened={open}
      onClose={() => setOpen(false)}
      title={<Title>View {folder.data?.name}&apos;s files</Title>}
      size='xl'
    >
      {folder.isSuccess ? (
        <>
          {folder.data.files.length ? (
            <SimpleGrid cols={3} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
              {folder.data.files.map((file) => (
                <File
                  disableMediaPreview={disableMediaPreview}
                  key={file.id}
                  image={file}
                  exifEnabled={exifEnabled}
                  refreshImages={folder.refetch}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Center>
              <Stack>
                <Text align='center'>No files in this folder</Text>
                <MutedText size='sm'>
                  Add files to {folder.data.name} by clicking a file in the Files tab and selecting a folder
                </MutedText>
              </Stack>
            </Center>
          )}
        </>
      ) : null}
    </Modal>
  );
}
