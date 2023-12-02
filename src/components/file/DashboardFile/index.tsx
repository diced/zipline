import type { File } from '@/lib/db/models/file';
import { Card } from '@mantine/core';
import { useState } from 'react';
import DashboardFileType from '../DashboardFileType';
import FileModal from './FileModal';

import styles from './index.module.css';

export default function DashboardFile({ file, reduce }: { file: File; reduce?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <FileModal open={open} setOpen={setOpen} file={file} reduce={reduce} />

      <Card shadow='md' radius='md' p={0} h={300} onClick={() => setOpen(true)} className={styles.file}>
        <DashboardFileType key={file.id} file={file} />
      </Card>
    </>
  );
}
