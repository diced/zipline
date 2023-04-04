import { Button, Modal, Title, Tooltip } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import AnchorNext from 'components/AnchorNext';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { DataTable } from 'mantine-datatable';
import { useEffect, useState } from 'react';

export type PendingFiles = {
  id: number;
  createdAt: string;
  status: string;
  chunks: number;
  chunksComplete: number;
  userId: number;
  data: {
    file: {
      filename: string;
      mimetype: string;
      lastchunk: boolean;
      identifier: string;
      totalBytes: number;
    };
    code?: number;
    message?: string;
  };
};

export default function PendingFilesModal({ open, onClose }) {
  const [incFiles, setIncFiles] = useState<PendingFiles[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFiles, setSelectedFiles] = useState<PendingFiles[]>([]);

  async function updateIncFiles() {
    setLoading(true);

    const files = await useFetch('/api/user/pending');
    setIncFiles(files);

    setLoading(false);
  }

  async function deleteIncFiles() {
    await useFetch('/api/user/pending', 'DELETE', {
      id: selectedFiles.map((file) => file.id),
    });
    updateIncFiles();
    setSelectedFiles([]);
  }

  useEffect(() => {
    updateIncFiles();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (open) updateIncFiles();
    }, 5000);

    return () => clearInterval(interval);
  }, [open]);

  return (
    <Modal title={<Title>Pending Files</Title>} size='auto' opened={open} onClose={onClose}>
      <MutedText size='xs'>Refreshing every 5 seconds...</MutedText>
      <DataTable
        withBorder
        borderRadius='md'
        highlightOnHover
        verticalSpacing='sm'
        minHeight={200}
        records={incFiles ?? []}
        columns={[
          { accessor: 'id', title: 'ID' },
          { accessor: 'createdAt', render: (file) => new Date(file.createdAt).toLocaleString() },
          { accessor: 'status', render: (file) => file.status.toLowerCase() },
          {
            accessor: 'progress',
            title: 'Progress',
            render: (file) => `${file.chunksComplete}/${file.chunks} chunks`,
          },
          {
            accessor: 'message',
            render: (file) =>
              file.data.code === 200 ? (
                <AnchorNext href={file.data.message} target='_blank'>
                  view file
                </AnchorNext>
              ) : (
                file.data.message
              ),
          },
        ]}
        fetching={loading}
        loaderBackgroundBlur={5}
        loaderVariant='dots'
        onSelectedRecordsChange={setSelectedFiles}
        selectedRecords={selectedFiles}
      />

      {selectedFiles.length ? (
        <Tooltip label='Clearing pending files will still leave the final file on the server.'>
          <Button
            variant='filled'
            my='md'
            color='red'
            onClick={deleteIncFiles}
            leftIcon={<IconTrash size='1rem' />}
            fullWidth
          >
            Clear {selectedFiles.length} pending file{selectedFiles.length > 1 ? 's' : ''}
          </Button>
        </Tooltip>
      ) : null}
    </Modal>
  );
}
