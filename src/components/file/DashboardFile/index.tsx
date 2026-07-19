import type { File } from '@/lib/db/models/file';
import { Card } from '@mantine/core';
import { useState } from 'react';
import DashboardFileType from '../DashboardFileType';
import FileContextMenu from '../FileContextMenu';
import DashboardFileModal from './DashboardFileModal';

import styles from './index.module.css';

export default function DashboardFile({
  file,
  reduce,
  compact,
  id,
  onOpen,
  onDelete,
}: {
  file: File;
  reduce?: boolean;
  compact?: boolean;
  id?: string;
  onOpen?: (fileId: string) => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const handleView = () => (onOpen ? onOpen(file.id) : setOpen(true));

  return (
    <div className={styles.item}>
      {!onOpen && (
        <DashboardFileModal
          open={open}
          setOpen={setOpen}
          file={file}
          reduce={reduce}
          user={id}
          onDelete={onDelete}
        />
      )}

      <FileContextMenu file={file} reduce={reduce} user={id} onView={handleView} onDelete={onDelete}>
        <Card shadow='md' radius='md' p={0} onClick={handleView} className={styles.file}>
          <DashboardFileType key={file.id} file={file} compact={compact} />
        </Card>
      </FileContextMenu>
    </div>
  );
}
