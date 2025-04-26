import React from 'react';
import { Folder } from '@/lib/db/models/folder';
import { File } from '@/lib/db/models/file';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Card, Text } from '@mantine/core';
import styles from '@/components/file/FileSystem/index.module.css';
import { IconFolder } from '@tabler/icons-react';

const FolderCard = React.memo(
  ({
     folder,
     onClick,
     handleContextMenu,
   }: {
    folder: Folder;
    onClick: () => void;
    handleContextMenu: (e: React.MouseEvent, type: 'file' | 'folder', item: File | Folder) => void;
  }) => {
    const { isOver, setNodeRef: dropRef } = useDroppable({ id: folder.id });
    const {
      attributes,
      listeners,
      setNodeRef: dragRef,
      isDragging,
    } = useDraggable({
      id: folder.id,
      data: { folder },
    });

    return (
      <div ref={dropRef}>
        <Card
          ref={dragRef}
          shadow='sm'
          radius='md'
          onClick={onClick}
          onContextMenu={(e) => handleContextMenu(e, 'folder', folder)}
          className={styles.folderCard}
          {...listeners}
          {...attributes}
          style={{
            opacity: isDragging ? 0.3 : isOver ? 0.3 : 1,
          }}
        >
          <IconFolder size={84} />
          <Text size='md' mt='xs' fw='bold' truncate>
            {folder.name}
          </Text>
        </Card>
      </div>
    );
  },
);

export default FolderCard;
