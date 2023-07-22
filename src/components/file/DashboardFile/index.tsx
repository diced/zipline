import type { File } from '@/lib/db/models/file';
import { Card } from '@mantine/core';
import { useState } from 'react';
import DashboardFileType from '../DashboardFileType';
import FileModal from './FileModal';

export default function DashboardFile({ file }: { file: File }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <FileModal open={open} setOpen={setOpen} file={file} />

      <Card
        shadow='md'
        radius='md'
        p={0}
        h={300}
        sx={{
          '&:hover': {
            cursor: 'pointer',
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.1), 0 4px 12px -1px rgba(0, 0, 0, 0.1)',
            filter: 'brightness(0.86)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
        onClick={() => setOpen(true)}
      >
        <DashboardFileType key={file.id} file={file} />
      </Card>
    </>
  );
}
