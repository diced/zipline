import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconFileUpload, IconFileXFilled } from '@tabler/icons-react';

interface UseBatchUploadProps {
  batchSize: number;
  uploadFiles: (files: File[]) => Promise<any>;
  onQueueUpdate?: (queue: File[]) => void;
  onBatchIndexUpdate?: (index: number) => void;
}

export function useBatchUpload({
  batchSize,
  uploadFiles,
  onQueueUpdate,
  onBatchIndexUpdate,
}: UseBatchUploadProps) {
  const uploadFilesInBatches = async (allFiles: File[]) => {
    if (allFiles.length === 0) return;

    onQueueUpdate?.(allFiles);
    onBatchIndexUpdate?.(0);

    const totalFiles = allFiles.length;
    const batches = [];

    for (let i = 0; i < allFiles.length; i += batchSize) {
      batches.push(allFiles.slice(i, i + batchSize));
    }

    notifications.show({
      title: 'Upload started',
      message: `Uploading ${totalFiles} file${totalFiles !== 1 ? 's' : ''} in ${batches.length} batch${batches.length !== 1 ? 'es' : ''}`,
      color: 'blue',
      icon: <IconFileUpload size='1rem' />,
      autoClose: 3000,
    });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      onBatchIndexUpdate?.(i);

      try {
        await uploadFiles(batch);

        if (i < batches.length - 1) {
          notifications.show({
            title: 'Batch completed',
            message: `Completed batch ${i + 1}/${batches.length}. Processing next batch...`,
            color: 'blue',
            icon: <IconFileUpload size='1rem' />,
            autoClose: 2000,
          });
        }
      } catch (error) {
        notifications.show({
          title: 'Batch upload failed',
          message: `Failed to upload batch ${i + 1}/${batches.length}`,
          color: 'red',
          icon: <IconFileXFilled size='1rem' />,
          autoClose: 5000,
        });
      }
    }
  };

  return {
    uploadFilesInBatches,
  };
}
