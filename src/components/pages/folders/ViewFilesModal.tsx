import DashboardFile from '@/components/file/DashboardFile';
import { Folder } from '@/lib/db/models/folder';
import { Modal, Paper, SimpleGrid, Title } from '@mantine/core';

export default function ViewFilesModal({
  folder,
  opened,
  onClose,
}: {
  folder: Folder | null;
  opened: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      size='auto'
      zIndex={100}
      centered
      title={<Title>{folder?.name}</Title>}
      opened={opened}
      onClose={onClose}
    >
      {folder?.files?.length === 0 ? (
        <Paper p='lg' withBorder>
          No files found
        </Paper>
      ) : (
        <SimpleGrid
          my='sm'
          spacing='md'
          cols={{
            base: 1,
            md: 2,
            lg: 3,
          }}
          pos='relative'
        >
          {folder?.files?.map((file) => <DashboardFile file={file} key={file.id} />)}
        </SimpleGrid>
      )}
    </Modal>
  );
}
