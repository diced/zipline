import { File } from '@/lib/db/models/file';
import React from 'react';
import { Folder } from '@/lib/db/models/folder';
import { useDraggable } from '@dnd-kit/core';
import DashboardFile from '@/components/file/DashboardFile';

const FileCard = ({
  file,
  handleContextMenu,
  setFileInModal,
  setOpenFileModal,
}: {
  file: File;
  handleContextMenu: (e: React.MouseEvent, type: 'file' | 'folder', item: File | Folder) => void;
  setFileInModal: (file: File | undefined) => void;
  setOpenFileModal: (open: boolean) => void;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: file.id,
    data: {
      file: file,
    },
  });

  return (
    <DashboardFile
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onContextMenu={(e) => handleContextMenu(e, 'file', file)}
      style={{
        opacity: isDragging ? 0.3 : 1,
      }}
      file={file}
      onOpenFile={() => {
        setFileInModal(file);
        setOpenFileModal(true);
      }}
    />
  );
};

export default FileCard;
