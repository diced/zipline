import { useCodeMap } from '@/components/ConfigProvider';
import Render from '@/components/render/Render';
import { renderMode } from '@/components/render/renderMode';
import { bytes } from '@/lib/bytes';
import { uploadFiles } from '@/lib/client/upload/files';
import { createTextFiles } from '@/lib/client/upload/text';
import useMultiTextFiles from '@/lib/client/upload/useMultiTextFiles';
import { useUploadOptionsStore } from '@/lib/client/store/uploadOptions';
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconFiles, IconPlus, IconTrashFilled, IconUpload } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import UploadOptionsButton from '../UploadOptionsButton';
import styles from './index.module.css';

export default function UploadText({ initialText }: { initialText?: string }) {
  const { t } = useTranslation('upload');
  const clipboard = useClipboard();
  const [options, ephemeral, clearEphemeral] = useUploadOptionsStore(
    useShallow((state) => [state.options, state.ephemeral, state.clearEphemeral]),
  );

  const [loading, setLoading] = useState(false);
  const [files, selected, { setFile, addFile, removeFile }] = useMultiTextFiles(initialText);

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
  }, [handleBeforeUnload]);

  const handleTab = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd, value } = textarea;
        const newValue = `${value.substring(0, selectionStart)}  ${value.substring(selectionEnd)}`;

        setFile(index, 'text', newValue);
        requestAnimationFrame(() => textarea.setSelectionRange(selectionStart + 2, selectionStart + 2));
      }
    },
    [setFile],
  );

  const aggSize = useCallback(
    () => files.reduce((acc, file) => acc + new Blob([file.text]).size, 0),
    [files],
  );

  const upload = async () => {
    const fileBlobs = createTextFiles(files, codeMap);

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
    <Stack gap='sm'>
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

      <Tabs defaultValue='textareas' variant='pills'>
        <Group justify='space-between' mb='xs' gap='xs'>
          <Tabs.List>
            <Tabs.Tab value='textareas'>{t('text.tabs.text')}</Tabs.Tab>
            <Tabs.Tab value='preview'>{t('text.tabs.preview')}</Tabs.Tab>
          </Tabs.List>
          <Group gap='xs'>
            {files.some((file) => file.text.length > 0) && (
              <Button
                variant='outline'
                color='red'
                size='compact-xs'
                disabled={loading}
                leftSection={<IconTrashFilled size='1rem' />}
                onClick={() => removeFile(true)}
              >
                {t('actions.clearAll')}
              </Button>
            )}
            <Button
              onClick={() => addFile(selected)}
              variant='outline'
              size='compact-xs'
              disabled={loading}
              leftSection={<IconPlus size='1rem' />}
            >
              {t('text.addFile')}
            </Button>
          </Group>
        </Group>

        <Tabs.Panel value='textareas'>
          <Stack gap='sm'>
            {files.map((file, index) => (
              <Paper key={index} withBorder className={styles.editor}>
                <Group justify='space-between' gap='sm' px='xs' py={6}>
                  <Text size='xs' c='dimmed' id={`text-file-${index}`}>
                    {t('text.fileHeading', { number: index + 1 })}
                  </Text>
                  <Group gap='xs'>
                    <Select
                      size='xs'
                      w={170}
                      aria-label={t('text.language')}
                      data={codeMap.map((meta) => ({ value: meta.ext, label: meta.name }))}
                      value={file.lang}
                      onChange={(value) => value && setFile(index, 'lang', value)}
                      disabled={loading}
                      allowDeselect={false}
                      searchable
                    />
                    {files.length > 1 && (
                      <Tooltip label={t('text.removeFile', { number: index + 1 })}>
                        <ActionIcon
                          onClick={() => removeFile(index)}
                          aria-label={t('text.removeFile', { number: index + 1 })}
                          variant='outline'
                          color='red'
                          size='md'
                          disabled={loading}
                        >
                          <IconTrashFilled size='1rem' />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Group>
                <Divider />

                <Textarea
                  value={file.text}
                  onChange={(e) => setFile(index, 'text', e.currentTarget.value)}
                  onKeyDown={(e) => handleTab(e, index)}
                  aria-labelledby={`text-file-${index}`}
                  disabled={loading}
                  spellCheck={false}
                  variant='unstyled'
                  className={styles.textarea}
                  resize='vertical'
                />
              </Paper>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value='preview'>
          <Stack gap='sm'>
            {files.map((file, index) => (
              <Paper key={index} withBorder className={styles.editor}>
                <Group justify='space-between' px='xs' py={6}>
                  <Text size='xs' c='dimmed'>
                    {t('text.fileHeading', { number: index + 1 })}
                  </Text>
                  <Text size='xs' c='dimmed'>
                    {codeMap.find((meta) => meta.ext === file.lang)?.name ?? file.lang}
                  </Text>
                </Group>
                <Divider />
                <Box p='xs' className={styles.preview}>
                  {file.text ? (
                    <Render mode={renderMode(file.lang)} code={file.text} language={file.lang} />
                  ) : (
                    <Text size='sm' c='dimmed'>
                      {t('text.emptyPreview')}
                    </Text>
                  )}
                </Box>
              </Paper>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Group justify='flex-end' gap='xs'>
        <UploadOptionsButton numFiles={files.length} />
        <Button
          variant='outline'
          leftSection={<IconUpload size='1rem' />}
          disabled={files.some((file) => file.text.length === 0)}
          loading={loading}
          onClick={upload}
          flex={{ base: 1, xs: 'initial' }}
          miw={0}
        >
          {t('actions.upload', { count: files.length, size: bytes(aggSize()) })}
        </Button>
      </Group>
    </Stack>
  );
}
