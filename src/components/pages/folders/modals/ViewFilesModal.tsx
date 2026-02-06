import { Folder } from '@/lib/db/models/folder';
import { Alert, Anchor, Button, CopyButton, Group, Modal, SimpleGrid, Skeleton, Text } from '@mantine/core';
import { IconShare } from '@tabler/icons-react';
import { lazy, Suspense } from 'react';

const DashboardFile = lazy(() => import('@/components/file/DashboardFile'));

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
      title={`Files in ${folder?.name}`}
      opened={opened}
      onClose={onClose}
    >
      {folder?.allowUploads && (
        <Alert
          icon={<IconShare size='1rem' />}
          variant='outline'
          mb='sm'
          styles={{ message: { marginTop: 0 } }}
        >
          This folder allows anonymous uploads. Share the link below to allow others to let others upload
          files to this folder.
          <br />
          <Anchor href={`/folder/${folder.id}/upload`} target='_blank'>
            {`${window?.location?.origin ?? ''}/folder/${folder.id}/upload`}
          </Anchor>
          <CopyButton value={`${window?.location?.origin ?? ''}/folder/${folder.id}/upload`}>
            {({ copied, copy }) => (
              <Button mx='sm' size='compact-xs' color={copied ? 'teal' : 'blue'} onClick={copy}>
                {copied ? 'Copied url' : 'Copy url'}
              </Button>
            )}
          </CopyButton>
        </Alert>
      )}

      {folder?.files?.length === 0 ? null : (
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
          {folder?.files?.map((file) => (
            <Suspense fallback={<Skeleton height={350} animate />} key={file.id}>
              <DashboardFile file={file} key={file.id} />
            </Suspense>
          ))}
        </SimpleGrid>
      )}

      <Group justify='space-between' mt='xs'>
        <Text size='sm' c='dimmed'>
          {folder?.id}
        </Text>
        <Text size='sm' c='dimmed'>
          {folder?.files?.length} files found
        </Text>
      </Group>
    </Modal>
  );
}
