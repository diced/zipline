import { useConfig } from '@/components/ConfigProvider';
import { bytes } from '@/lib/bytes';
import { useFolders } from '@/lib/client/hooks/useFolders';
import { useUploadOptionsStore } from '@/lib/client/store/uploadOptions';
import { buildFolderHierarchy } from '@/lib/folderHierarchy';
import { uploadFiles } from '@/lib/client/upload/files';
import { uploadPartialFiles } from '@/lib/client/upload/partial';
import { UploadProgress } from '@/lib/client/upload/useProgress';
import {
  Box,
  Button,
  Center,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { IconUpload } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSWRConfig } from 'swr';

function FolderSelectModal({
  onSelect,
  onCancel,
}: {
  onSelect: (folderId: string | undefined) => void;
  onCancel: () => void;
}) {
  const { data: folders } = useFolders();
  const folderOptions = useMemo(() => (folders ? buildFolderHierarchy(folders) : []), [folders]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const filtered = useMemo(
    () => folderOptions.filter((folder) => folder.path.toLowerCase().includes(search.toLowerCase().trim())),
    [folderOptions, search],
  );

  return (
    <Stack gap='md'>
      <TextInput
        placeholder='Search folders...'
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      <Paper withBorder style={{ overflow: 'hidden' }}>
        <ScrollArea.Autosize mah={360} type='auto'>
          <Stack gap={0}>
            <UnstyledButton
              onClick={() => setSelected(undefined)}
              style={{
                padding: 12,
                textAlign: 'left',
                background: selected === undefined ? 'var(--mantine-primary-color-light)' : undefined,
              }}
            >
              <Text size='sm'>No folder</Text>
            </UnstyledButton>

            {filtered.map((folder) => (
              <UnstyledButton
                key={folder.id}
                onClick={() => setSelected(folder.id)}
                style={{
                  padding: '8px 12px',
                  paddingLeft: `${12 + folder.depth * 16}px`,
                  textAlign: 'left',
                  background: selected === folder.id ? 'var(--mantine-primary-color-light)' : undefined,
                }}
              >
                <Text size='sm'>{folder.name}</Text>
              </UnstyledButton>
            ))}

            {filtered.length === 0 && search.trim() && (
              <Text size='sm' c='dimmed' p='sm'>
                No folders match your search.
              </Text>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Paper>

      <Group justify='right'>
        <Button variant='default' size='sm' onClick={onCancel}>
          Cancel
        </Button>
        <Button size='sm' onClick={() => onSelect(selected)} disabled={!folders}>
          Upload
        </Button>
      </Group>
    </Stack>
  );
}

function promptForFolder(): Promise<string | undefined | null> {
  return new Promise((resolve) => {
    const id = modals.open({
      title: 'Select folder',
      size: 'lg',
      centered: true,
      children: (
        <FolderSelectModal
          onSelect={(folderId) => {
            resolve(folderId);
            modals.close(id);
          }}
          onCancel={() => {
            resolve(null);
            modals.close(id);
          }}
        />
      ),
      onClose: () => resolve(null),
    });
  });
}

export default function DropUploadOverlay({
  folderId,
  onUploaded,
}: {
  folderId?: string | null;
  onUploaded?: () => void;
}) {
  const config = useConfig();
  const clipboard = useClipboard();
  const { mutate } = useSWRConfig();
  const [options, ephemeral, clearEphemeral] = useUploadOptionsStore(
    useShallow((state) => [state.options, state.ephemeral, state.clearEphemeral]),
  );

  const [dragging, setDragging] = useState(false);
  const [_counter, setCounter] = useState(0);
  const [progress, setProgress] = useState<UploadProgress>({ percent: 0, remaining: 0, speed: 0 });
  const [loading, setLoading] = useState(false);
  const [_files, setFiles] = useState<File[]>([]);

  const doUpload = useCallback(
    async (droppedFiles: File[], targetFolder: string | null | undefined) => {
      const folder = targetFolder ?? undefined;

      const maxBytes = config.chunks.enabled && bytes(config.chunks.max);
      const partialUploads: File[] = maxBytes ? droppedFiles.filter((file) => file.size >= maxBytes) : [];
      const normalUploads: File[] = maxBytes
        ? droppedFiles.filter((file) => file.size < maxBytes)
        : droppedFiles;

      try {
        if (normalUploads.length > 0) {
          await uploadFiles(normalUploads, {
            setFiles,
            setLoading,
            setProgress,
            clipboard,
            clearEphemeral,
            options,
            ephemeral,
            folder,
          });
        }

        if (partialUploads.length > 0) {
          await uploadPartialFiles(partialUploads, {
            setFiles,
            setLoading,
            setProgress,
            clipboard,
            clearEphemeral,
            options,
            ephemeral,
            config,
            folder,
          });
        }

        onUploaded?.();
      } finally {
        mutate(() => true, undefined, { revalidate: true });
      }
    },
    [config, clipboard, clearEphemeral, ephemeral, mutate, onUploaded, options],
  );

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setCounter((c) => c + 1);
      if (e.dataTransfer?.types.includes('Files')) setDragging(true);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setCounter((c) => {
        const next = c - 1;
        if (next <= 0) setDragging(false);
        return next;
      });
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setCounter(0);
      setDragging(false);

      const droppedFiles = Array.from(e.dataTransfer?.files ?? []);
      if (droppedFiles.length === 0) return;

      const targetFolder = folderId ?? (await promptForFolder());
      if (targetFolder === null) return;

      await doUpload(droppedFiles, targetFolder);
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [doUpload, folderId]);

  if (!dragging) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <Center
        style={{
          position: 'absolute',
          inset: 16,
          border: '3px dashed var(--mantine-primary-color-filled)',
          borderRadius: 'var(--mantine-radius-md)',
          background: 'var(--mantine-primary-color-light)',
        }}
      >
        <Stack align='center' gap='xs'>
          <IconUpload size='4rem' />
          <Title order={2}>Drop files to upload</Title>
          <Text size='sm' c='dimmed'>
            {folderId ? 'Files will be uploaded to the selected folder' : 'Choose a folder after dropping'}
          </Text>
          {loading && (
            <Text size='sm' fw={600}>
              {progress.percent}%
            </Text>
          )}
        </Stack>
      </Center>
    </Box>
  );
}
