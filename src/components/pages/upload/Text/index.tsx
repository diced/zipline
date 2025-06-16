import Render from '@/components/render/Render';
import { useUploadOptionsStore } from '@/lib/store/uploadOptions';
import DashboardUploadText from '@/pages/dashboard/upload/text';
import {
  ActionIcon,
  Button,
  Center,
  Group,
  Select,
  Tabs,
  Text,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCursorText, IconEyeFilled, IconFiles, IconRefresh, IconUpload } from '@tabler/icons-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import UploadOptionsButton from '../UploadOptionsButton';
import { renderMode } from '../renderMode';
import { uploadFiles } from '../uploadFiles';

import styles from './index.module.css';
import { useShallow } from 'zustand/shallow';

export default function UploadText({
  codeMeta,
}: {
  codeMeta: Parameters<typeof DashboardUploadText>[0]['codeMeta'];
}) {
  const clipboard = useClipboard();

  const [options, ephemeral, clearEphemeral] = useUploadOptionsStore(
    useShallow((state) => [state.options, state.ephemeral, state.clearEphemeral]),
  );

  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectingLanguage, setDetectingLanguage] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [hasAutoDetected, setHasAutoDetected] = useState(false); // Track if we've already auto-detected

  const renderIn = renderMode(selectedLanguage === 'auto' ? (detectedLanguage || 'txt') : selectedLanguage);

  const detectLanguage = async (textContent: string) => {
    if (!textContent.trim() || textContent.length < 10) {
      setDetectedLanguage(null);
      return;
    }

    setDetectingLanguage(true);
    try {
      const response = await fetch('/api/language-detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDetectedLanguage(data.languageId);
      }
    } catch (error) {
      console.error('Language detection failed:', error);
      setDetectedLanguage('txt'); // Fallback to plain text
    } finally {
      setDetectingLanguage(false);
    }
  };

  const handleTextChange = (value: string) => {
    setText(value);
    
    // Only auto-detect language on the first change when using auto mode
    if (selectedLanguage === 'auto' && !hasAutoDetected && value.trim()) {
      detectLanguage(value);
      setHasAutoDetected(true);
    }
  };

  const handleReguesLanguage = () => {
    if (selectedLanguage === 'auto' && text.trim()) {
      detectLanguage(text);
    }
  };

  // Auto-detect language when switching to auto mode
  useEffect(() => {
    if (selectedLanguage === 'auto' && text.trim() && !hasAutoDetected) {
      detectLanguage(text);
      setHasAutoDetected(true);
    } else if (selectedLanguage !== 'auto') {
      setDetectedLanguage(null);
      setHasAutoDetected(false); // Reset when switching away from auto
    }
  }, [selectedLanguage]);

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
    
    // Use detected language when in auto mode, otherwise use selected language
    const finalLanguage = selectedLanguage === 'auto' ? (detectedLanguage || 'txt') : selectedLanguage;

    const file = new File([blob], `text.${finalLanguage}`, {
      type: codeMeta.find((meta) => meta.ext === finalLanguage)?.mime,
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

        <Tooltip label='View your files'>
          <ActionIcon component={Link} href='/dashboard/files' variant='outline' radius='sm'>
            <IconFiles size={18} />
          </ActionIcon>
        </Tooltip>
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
            onChange={(e) => handleTextChange(e.currentTarget.value)}
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
            <Render 
              mode={renderIn} 
              code={text} 
              language={selectedLanguage === 'auto' ? (detectedLanguage || 'txt') : selectedLanguage} 
            />
          )}
        </Tabs.Panel>
      </Tabs>

      <Group justify='right' gap='sm' my='md'>
        <Group gap='xs'>
          <Select
            searchable
            value={selectedLanguage}
            data={[
              { value: 'auto', label: `Auto${detectedLanguage && selectedLanguage === 'auto' ? ` (${codeMeta.find(m => m.ext === detectedLanguage)?.name || detectedLanguage})` : ''}` },
              ...codeMeta.map((meta) => ({ value: meta.ext, label: meta.name }))
            ]}
            onChange={(value) => setSelectedLanguage(value as string)}
          />
          
          {selectedLanguage === 'auto' && (
            <Tooltip label="Re-guess language">
              <Button
                variant="outline"
                onClick={handleReguesLanguage}
                disabled={!text.trim() || detectingLanguage}
                loading={detectingLanguage}
              >
                <IconRefresh size='1rem' />
              </Button>
            </Tooltip>
          )}
        </Group>
        
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
