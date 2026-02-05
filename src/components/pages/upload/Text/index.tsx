import Render from '@/components/render/Render';
import { useUploadOptionsStore } from '@/lib/store/uploadOptions';
import { Button, Center, Group, Select, Tabs, Text, Textarea, Title } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCursorText, IconEyeFilled, IconFiles, IconUpload } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import UploadOptionsButton from '../UploadOptionsButton';
import { renderMode } from '../renderMode';
import { uploadFiles } from '../uploadFiles';

import { useCodeMap } from '@/components/ConfigProvider';
import styles from './index.module.css';

export default function UploadText() {
  const clipboard = useClipboard();
  const [options, ephemeral, clearEphemeral] = useUploadOptionsStore(
    useShallow((state) => [state.options, state.ephemeral, state.clearEphemeral]),
  );
  const [selectedLanguage, setSelectedLanguage] = useState('txt');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const codeMap = useCodeMap();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (text.length > 0) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [text]);

  const renderIn = renderMode(selectedLanguage);

  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = e.currentTarget;
      const newValue = `${value.substring(0, selectionStart)}  ${value.substring(selectionEnd)}`;
      setText(newValue);
    }
  };

  const upload = () => {
    const blob = new Blob([text]);
    const file = new File([blob], `text.${selectedLanguage}`, {
      type: codeMap.find((meta) => meta.ext === selectedLanguage)?.mime,
      lastModified: Date.now(),
    });

    uploadFiles([file], {
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
        <Title order={1}>Upload text</Title>

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

      <Tabs defaultValue='textarea' variant='pills' my='sm'>
        <Tabs.List my='sm'>
          <Tabs.Tab value='textarea' leftSection={<IconCursorText size='1rem' />}>
            Text
          </Tabs.Tab>
          <Tabs.Tab value='preview' leftSection={<IconEyeFilled size='1rem' />}>
            Preview
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value='textarea'>
          <Textarea
            my='md'
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            onKeyDown={handleTab}
            disabled={loading}
            className={styles.textarea}
          />
        </Tabs.Panel>

        <Tabs.Panel value='preview'>
          {text.length === 0 ? (
            <Center h='100%'>
              <Text size='md' c='red'>
                No text to preview!
              </Text>
            </Center>
          ) : (
            <Render mode={renderIn} code={text} language={selectedLanguage} />
          )}
        </Tabs.Panel>
      </Tabs>

      <Group justify='right' gap='sm' my='md'>
        <Select
          searchable
          defaultValue='txt'
          data={codeMap.map((meta) => ({ value: meta.ext, label: meta.name }))}
          onChange={(value) => setSelectedLanguage(value as string)}
        />
        <UploadOptionsButton numFiles={1} />
        <Button
          variant='outline'
          leftSection={<IconUpload size='1rem' />}
          disabled={text.length === 0 || loading}
          onClick={upload}
        >
          Upload
        </Button>
      </Group>
    </>
  );
}
