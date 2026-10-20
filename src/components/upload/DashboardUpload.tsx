import { useCodeMap } from '@/components/ConfigProvider';
import { useSettingsStore, type UploadBehavior } from '@/lib/client/store/settings';
import { getPastedContent } from '@/lib/client/upload/paste';
import { createTextFiles } from '@/lib/client/upload/text';
import { Stack, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { showNotification } from '@mantine/notifications';
import { IconUpload } from '@tabler/icons-react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import FileUploadProvider, { useFileUpload } from './FileUploadProvider';

export default function DashboardUpload({ children }: { children: React.ReactNode }) {
  return (
    <FileUploadProvider>
      <DashboardUploadCapture>{children}</DashboardUploadCapture>
    </FileUploadProvider>
  );
}

function DashboardUploadCapture({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('upload');
  const codeMap = useCodeMap();
  const navigate = useNavigate();
  const location = useLocation();
  const isUploadPage = location.pathname.startsWith('/dashboard/upload/');
  const { setFiles, upload } = useFileUpload();
  const [dropBehavior, pasteBehavior] = useSettingsStore(
    useShallow((state) => [state.settings.fileDropBehavior, state.settings.filePasteBehavior]),
  );

  const receiveFiles = useCallback(
    (files: File[], behavior: UploadBehavior) => {
      if (isUploadPage || files.length === 0 || behavior === 'disabled') return;

      setFiles((prev) => [...files, ...prev]);
      if (behavior === 'upload') {
        upload(files);
      } else {
        showNotification({
          title: t('global.queued', { count: files.length }),
          message: t('global.reviewMessage'),
          color: 'blue',
          icon: <IconUpload size='1rem' />,
        });
        navigate('/dashboard/upload/file');
      }
    },
    [isUploadPage, setFiles, upload, navigate, t],
  );

  useEffect(() => {
    if (isUploadPage || pasteBehavior === 'disabled') return;

    const handlePaste = (event: ClipboardEvent) => {
      const content = getPastedContent(event);
      if (!content) return;

      const { files, text } = content;
      if (files.length > 0) {
        event.preventDefault();
        receiveFiles(files, pasteBehavior);
        return;
      }

      if (text.trim().length === 0) return;

      event.preventDefault();
      if (pasteBehavior === 'upload') {
        receiveFiles(createTextFiles([{ text, lang: 'txt' }], codeMap), pasteBehavior);
      } else {
        showNotification({
          title: t('global.textQueued'),
          message: t('global.textReviewMessage'),
          color: 'blue',
          icon: <IconUpload size='1rem' />,
        });
        navigate('/dashboard/upload/text', { state: { pastedText: text } });
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isUploadPage, pasteBehavior, receiveFiles, codeMap, navigate, t]);

  return (
    <>
      {children}

      {!isUploadPage && dropBehavior !== 'disabled' && (
        <Dropzone.FullScreen
          onDrop={(files) => receiveFiles(files, dropBehavior)}
          activateOnKeyboard={false}
          acceptColor='dark'
        >
          <Stack align='center' gap='sm' style={{ pointerEvents: 'none' }}>
            <IconUpload size='3.2rem' stroke={1.5} />
            <Text size='xl' fw={500}>
              {t(dropBehavior === 'upload' ? 'global.dropUpload' : 'global.dropReview')}
            </Text>
            <Text size='sm' c='dimmed'>
              {t('global.savedOptions')}
            </Text>
          </Stack>
        </Dropzone.FullScreen>
      )}
    </>
  );
}
