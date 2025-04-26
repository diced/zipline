import { Folder } from '@/lib/db/models/folder';
import { useDroppable } from '@dnd-kit/core';
import { Anchor, Box } from '@mantine/core';
import styles from '@/components/file/FileSystem/index.module.css';
import React from 'react';

const BreadcrumbAnchor = ({
  folder,
  onSetFolder,
}: {
  folder: Folder;
  onSetFolder: (folder: Folder) => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: folder.id });

  return (
    <Box ref={setNodeRef}>
      <Anchor onClick={() => onSetFolder(folder)} className={isOver ? styles.anchorOver : styles.anchor}>
        {folder.name}
      </Anchor>
    </Box>
  );
};

export default BreadcrumbAnchor;
