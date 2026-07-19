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
  selected,
  onSelect,
}: {
  file: File;
  reduce?: boolean;
  compact?: boolean;
  id?: string;
  onOpen?: (fileId: string) => void;
  onDelete?: () => void;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleView = () => (onOpen ? onOpen(file.id) : setOpen(true));

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onSelect?.(e);
      return;
    }
    handleView();
  };

  return (
    <div
      className={[styles.item, selected && styles.selected].filter(Boolean).join(' ')}
      onClick={handleClick}
    >
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
        <Card shadow='md' radius='md' p={0} className={styles.file}>
          <DashboardFileType key={file.id} file={file} compact={compact} />
        </Card>
      </FileContextMenu>
    </div>
  );
}
