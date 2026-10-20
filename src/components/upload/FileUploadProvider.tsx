import { useConfig } from '@/components/ConfigProvider';
import { useUploadOptionsStore } from '@/lib/client/store/uploadOptions';
import { uploadFileBatch } from '@/lib/client/upload/files';
import { initialState, useProgress, type UploadProgress } from '@/lib/client/upload/useProgress';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type FileUploadContextType = {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  progress: UploadProgress;
  loading: boolean;
  upload: (files: File[]) => Promise<void>;
};

const FileUploadContext = createContext<FileUploadContextType | null>(null);

export function useFileUpload() {
  const ctx = useContext(FileUploadContext);
  if (!ctx) throw new Error('useFileUpload must be used within a FileUploadProvider');

  return ctx;
}

export default function FileUploadProvider({
  children,
  folder,
}: {
  children: React.ReactNode;
  folder?: string;
}) {
  const config = useConfig();
  const clipboard = useClipboard();
  const { t } = useTranslation('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useProgress();
  const [pendingUploads, setPendingUploads] = useState(0);
  const queue = useRef(Promise.resolve());

  const upload = useCallback(
    (batch: File[]) => {
      if (batch.length === 0) return Promise.resolve();

      const { options, ephemeral } = useUploadOptionsStore.getState();
      setPendingUploads((count) => count + 1);

      const next = queue.current.then(async () => {
        try {
          await uploadFileBatch(batch, {
            config,
            options,
            ephemeral,
            folder,
            clipboard,
            setFiles,
            setProgress,
            clearEphemeral: () => {
              const state = useUploadOptionsStore.getState();
              if (state.ephemeral === ephemeral) state.clearEphemeral();
            },
          });
        } catch (error) {
          showNotification({
            title: t('notifications.error.title'),
            message: error instanceof Error ? error.message : t('errors.unknown'),
            color: 'red',
          });
        } finally {
          setProgress(initialState);
          setPendingUploads((count) => count - 1);
        }
      });

      queue.current = next;
      return next;
    },
    [config, clipboard, folder, setProgress, t],
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (files.length > 0 || pendingUploads > 0) event.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [files.length, pendingUploads]);

  return (
    <FileUploadContext.Provider value={{ files, setFiles, progress, loading: pendingUploads > 0, upload }}>
      {children}
    </FileUploadContext.Provider>
  );
}
