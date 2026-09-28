import { useCodeMap } from '@/components/ConfigProvider';
import Render from '@/components/render/Render';
import { renderMode } from '@/components/render/renderMode';
import { bytes } from '@/lib/bytes';
import { uploadFiles } from '@/lib/client/upload/files';
import useMultiTextFiles from '@/lib/client/upload/useMultiTextFiles';
import { useUploadOptionsStore } from '@/lib/client/store/uploadOptions';
import { ActionIcon, Button, Group, Select, Tabs, Textarea, Title } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconCursorText,
  IconEyeFilled,
  IconFiles,
  IconPlus,
  IconTrashFilled,
  IconUpload,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import UploadOptionsButton from '../UploadOptionsButton';
import styles from './index.module.css';

export default function UploadText() {
  const { t } = useTranslation('upload');
  const clipboard = useClipboard();
  const [options, ephemeral, clearEphemeral] = useUploadOptionsStore(
    useShallow((state) => [state.options, state.ephemeral, state.clearEphemeral]),
  );

  const [loading, setLoading] = useState(false);
  const [files, selected, { setFile, addFile, removeFile }] = useMultiTextFiles();

  const codeMap = useCodeMap();

  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      for (const file of files) {
        if (file.text.length > 0) e.preventDefault();
      }
    },
    [files],
  );

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [files]);

  const handleTab = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const { selectionStart, selectionEnd, value } = e.currentTarget;
        const newValue = `${value.substring(0, selectionStart)}  ${value.substring(selectionEnd)}`;

        setFile(selected, 'text', newValue);
      }
    },
    [selected, setFile],
  );

  const aggSize = useCallback(
    () => files.reduce((acc, file) => acc + new Blob([file.text]).size, 0),
    [files],
  );

  const upload = async () => {
    const fileBlobs = files.map((file) => {
      const blob = new Blob([file.text], {
        type: codeMap.find((meta) => meta.ext === file.lang)?.mime,
      });

      return new File([blob], `text.${file.lang}`, {
        type: blob.type,
        lastModified: Date.now(),
      });
    });

    await uploadFiles(fileBlobs, {
      clipboard,
      setFiles: () => {},
      setLoading,
      setProgress: () => {},
      clearEphemeral,
      options,
      ephemeral,
    });
  };

  return (
    <>
      <Group gap='sm'>
        <Title order={1}>{t('text.title')}</Title>

        <Button
          variant='outline'
          size='compact-sm'
          component={Link}
          to='/dashboard/files'
          leftSection={<IconFiles size='1rem' />}
        >
          {t('actions.goToFiles')}
        </Button>
      </Group>

      <Tabs defaultValue='textareas' variant='pills' my='sm'>
        <Tabs.List my='sm'>
          <Tabs.Tab value='textareas' leftSection={<IconCursorText size='1rem' />}>
            {t('text.tabs.text')}
          </Tabs.Tab>
          <Tabs.Tab value='preview' leftSection={<IconEyeFilled size='1rem' />}>
            {t('text.tabs.preview')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value='textareas'>
          {files.map((file, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <Textarea
                value={file.text}
                onChange={(e) => setFile(index, 'text', e.currentTarget.value)}
                onKeyDown={handleTab}
                disabled={loading}
                className={styles.textarea}
                my='sm'
                resize='vertical'
              />

              <Group style={{ position: 'absolute', bottom: 10, right: 10 }} gap='xs'>
                <Select
                  size='xs'
                  data={codeMap.map((meta) => ({ value: meta.ext, label: meta.name }))}
                  value={file.lang}
                  onChange={(value) => setFile(index, 'lang', value as string)}
                  searchable
                />

                {files.length > 1 && (
                  <ActionIcon onClick={() => removeFile(index)} variant='outline' color='red' size='md'>
                    <IconTrashFilled size='1rem' />
                  </ActionIcon>
                )}
              </Group>
            </div>
          ))}
          <Group my='sm' justify='center'>
            <Button
              onClick={() => addFile(selected)}
              variant='outline'
              size='compact-sm'
              leftSection={<IconPlus size='1rem' />}
            >
              {t('text.addFile')}
            </Button>

            {files.some((file) => file.text.length > 0) && (
              <Button
                variant='outline'
                size='compact-sm'
                leftSection={<IconTrashFilled size='1rem' />}
                onClick={() => removeFile(true)}
              >
                {t('actions.clearAll')}
              </Button>
            )}
          </Group>
        </Tabs.Panel>

        <Tabs.Panel value='preview'>
          {files.map((file, index) => (
            <div key={index}>
              <Title order={4}>{t('text.fileHeading', { number: index + 1 })}</Title>
              <Render mode={renderMode(file.lang)} code={file.text} language={file.lang} />
            </div>
          ))}
        </Tabs.Panel>
      </Tabs>

      <Group justify='right' gap='sm' my='md'>
        <UploadOptionsButton numFiles={1} />
        <Button
          variant='outline'
          leftSection={<IconUpload size='1rem' />}
          disabled={files.some((file) => file.text.length === 0) || loading}
          onClick={upload}
        >
          {t('actions.upload', { count: files.length, size: bytes(aggSize()) })}
        </Button>
      </Group>
    </>
  );
}
