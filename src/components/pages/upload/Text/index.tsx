import { useCodeMap } from '@/components/ConfigProvider';
import Render from '@/components/render/Render';
import { renderMode } from '@/components/render/renderMode';
import { bytes } from '@/lib/bytes';
import { uploadFiles } from '@/lib/client/upload/files';
import useMultiTextFiles from '@/lib/client/upload/useMultiTextFiles';
import { useUploadOptionsStore } from '@/lib/client/store/uploadOptions';
import { ActionIcon, Button, Group, Select, Tabs, Textarea, TextInput, Title } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconCode,
  IconEyeFilled,
  IconFiles,
  IconPlus,
  IconTrashFilled,
  IconUpload,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import UploadOptionsButton from '../UploadOptionsButton';
import styles from './index.module.css';

export default function UploadText() {
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

  const handleLangChange = useCallback(
    (index: number, lang: string) => {
      setFile(index, 'lang', lang);
      const current = files[index].name;
      const base = current.includes('.') ? current.slice(0, current.lastIndexOf('.')) : current;
      setFile(index, 'name', `${base || 'snippet'}.${lang}`);
    },
    [files, setFile],
  );

  const aggSize = useCallback(
    () => files.reduce((acc, file) => acc + new Blob([file.text]).size, 0),
    [files],
  );

  const upload = async () => {
    const fileBlobs = files.map((file) => {
      const blob = new Blob([file.text], {
        type: codeMap.find((meta) => meta.ext === file.lang)?.mime || 'text/plain',
      });

      const name = file.name.trim() || `snippet.${file.lang}`;

      return new File([blob], name, {
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
        <Title order={1}>Upload snippet</Title>

        <Button
          variant='outline'
          size='compact-sm'
          component={Link}
          to='/dashboard/files'
          leftSection={<IconFiles size='1rem' />}
        >
          Go to files
        </Button>
      </Group>

      <Tabs defaultValue='textareas' variant='pills' my='sm'>
        <Tabs.List my='sm'>
          <Tabs.Tab value='textareas' leftSection={<IconCode size='1rem' />}>
            Editor
          </Tabs.Tab>
          <Tabs.Tab value='preview' leftSection={<IconEyeFilled size='1rem' />}>
            Preview
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value='textareas'>
          {files.map((file, index) => (
            <div key={index} className={styles.snippet}>
              <Group gap='xs' mb='xs'>
                <TextInput
                  size='xs'
                  placeholder='snippet.js'
                  label='Filename'
                  value={file.name}
                  onChange={(e) => setFile(index, 'name', e.currentTarget.value)}
                  style={{ flex: 1 }}
                />
                <Select
                  size='xs'
                  label='Language'
                  data={codeMap.map((meta) => ({ value: meta.ext, label: meta.name }))}
                  value={file.lang}
                  onChange={(value) => value && handleLangChange(index, value)}
                  searchable
                />

                {files.length > 1 && (
                  <ActionIcon
                    onClick={() => removeFile(index)}
                    variant='outline'
                    color='red'
                    size='md'
                    style={{ alignSelf: 'flex-end' }}
                  >
                    <IconTrashFilled size='1rem' />
                  </ActionIcon>
                )}
              </Group>

              <Textarea
                value={file.text}
                onChange={(e) => setFile(index, 'text', e.currentTarget.value)}
                onKeyDown={handleTab}
                disabled={loading}
                className={styles.textarea}
                resize='vertical'
                placeholder='Paste your code here...'
                rows={16}
              />
            </div>
          ))}
          <Group my='sm' justify='center'>
            <Button
              onClick={() => addFile(selected)}
              variant='outline'
              size='compact-sm'
              leftSection={<IconPlus size='1rem' />}
            >
              Add snippet
            </Button>

            {files.some((file) => file.text.length > 0) && (
              <Button
                variant='outline'
                size='compact-sm'
                leftSection={<IconTrashFilled size='1rem' />}
                onClick={() => removeFile(true)}
              >
                Clear all
              </Button>
            )}
          </Group>
        </Tabs.Panel>

        <Tabs.Panel value='preview'>
          {files.map((file, index) => (
            <div key={index}>
              <Title order={4}>{file.name || `snippet.${file.lang}`}</Title>
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
          Upload {files.length} snippet{files.length !== 1 && 's'} ({bytes(aggSize())})
        </Button>
      </Group>
    </>
  );
}
