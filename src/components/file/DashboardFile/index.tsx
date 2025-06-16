import type { File } from '@/lib/db/models/file';
import { Card, Text, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { useState } from 'react';
import DashboardFileType from '../DashboardFileType';
import FileModal from './FileModal';

import styles from './index.module.css';

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DashboardFile({
  file,
  reduce,
  selectionMode = false,
  selected = false,
  onSelect,
}: {
  file: File;
  reduce?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const clipboard = useClipboard();

  const handleCardClick = (e: React.MouseEvent) => {
    // Handle Shift+Click to copy file link
    if (e.shiftKey) {
      e.stopPropagation();
      const fileUrl = `${window.location.origin}/raw/${file.name}`;
      clipboard.copy(fileUrl);
      showNotification({
        title: 'Link Copied',
        message: `File link copied to clipboard: ${file.name}`,
        color: 'green',
      });
      return;
    }

    if (selectionMode) {
      e.stopPropagation();
      onSelect?.(!selected);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <FileModal open={open} setOpen={setOpen} file={file} reduce={reduce} />{' '}
      <Card
        shadow='md'
        radius='md'
        p={0}
        onClick={handleCardClick}
        className={`${styles.file} ${
          selectionMode ? styles.fileSelectionMode : ''
        } ${selected ? styles.fileSelected : ''}`}
        style={{
          height: 'fit-content',
          breakInside: 'avoid',
          marginBottom: '0.5rem',
          display: 'inline-block',
          width: '100%',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        {' '}
        <DashboardFileType key={file.id} file={file} />
        {/* File size - bottom right */}
        <div className={`${styles.fileOverlay} ${styles.fileOverlayRight}`}>
          <Text size='xs' c='white' fw={500}>
            {formatFileSize(file.size)}
          </Text>
        </div>
      </Card>
    </>
  );
}
