import { CopyButton, Paper, ScrollArea, Text, useMantineTheme, Button } from '@mantine/core';
import {
  IconCheck,
  IconClipboardCopy,
  IconUpload,
  IconArrowDown,
  IconExternalLink,
} from '@tabler/icons-react';
import hljs from 'highlight.js';
import { useRef, useEffect, useState } from 'react';

interface PasteInfo {
  pasteId?: string | null;
  pasteUrl?: string | null;
  pasteCreatedAt?: Date | null;
  exists: boolean;
}

export default function HighlightCode({
  language,
  code,
  onUploadToPaste,
  isUploading,
  fileName: _fileName,
  fileId,
  inModal = false,
}: {
  language: string;
  code: string;
  onUploadToPaste?: () => Promise<void>;
  isUploading?: boolean;
  fileName?: string;
  fileId?: string;
  inModal?: boolean;
}) {
  const _theme = useMantineTheme();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [pasteInfo, setPasteInfo] = useState<PasteInfo>({ exists: false });
  const [loadingPasteInfo, setLoadingPasteInfo] = useState(false);

  // Check paste status on component mount
  useEffect(() => {
    if (fileId) {
      checkPasteStatus();
    }
  }, [fileId]);

  const checkPasteStatus = async () => {
    if (!fileId) return;

    setLoadingPasteInfo(true);
    try {
      const response = await fetch(`/api/paste/${fileId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: PasteInfo = await response.json();
        setPasteInfo(data);
      }
    } catch (error) {
      console.error('Error checking paste status:', error);
    } finally {
      setLoadingPasteInfo(false);
    }
  };

  // Enhanced upload function that updates local state
  const handleUploadToPaste = async () => {
    if (onUploadToPaste) {
      await onUploadToPaste();
      // Refresh paste status after upload
      await checkPasteStatus();
    }
  };

  const scrollToBottom = () => {
    // Find all scrollable elements within the ScrollArea
    if (scrollAreaRef.current) {
      const allElements = scrollAreaRef.current.querySelectorAll('*');
      const scrollableElements: Element[] = [];

      allElements.forEach((el) => {
        if (el.scrollHeight > el.clientHeight) {
          scrollableElements.push(el);
        }
      });

      // Try scrolling each scrollable element
      scrollableElements.forEach((el) => {
        try {
          if (el.scrollTo) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
          } else {
            (el as any).scrollTop = el.scrollHeight;
          }
        } catch {
          // Silently handle any scroll errors
        }
      });
    }

    // Fallback: scroll the last code line into view
    if (paperRef.current) {
      const lastElement = paperRef.current.querySelector('code > div:last-child');
      if (lastElement) {
        lastElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  };

  const lines = code.split('\n');
  const lineNumbers = lines.map((_, i) => i + 1);

  if (!hljs.getLanguage(language)) {
    language = 'text';
  }
  return (
    <Paper ref={paperRef} withBorder p='xs' my='md' pos='relative'>
      {/* Fixed button container at top right */}{' '}
      <div
        style={{
          position: 'sticky',
          top: inModal ? '0.5rem' : '1.2rem',
          right: inModal ? '0.5rem' : '1.2rem',
          zIndex: inModal ? 1000 : 100,
          display: 'flex',
          gap: '0.5rem',
          float: 'right',
          backgroundColor: 'var(--mantine-color-body)',
          borderRadius: '4px',
          padding: '0.25rem',
          marginBottom: '0.5rem',
          boxShadow: inModal ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
        }}
      >
        {' '}
        {onUploadToPaste && !pasteInfo.exists && (
          <Button
            onClick={handleUploadToPaste}
            variant='outline'
            color='blue'
            size='compact-sm'
            leftSection={<IconUpload size='1rem' />}
            loading={isUploading || loadingPasteInfo}
            disabled={isUploading || loadingPasteInfo}
          >
            Pastey
          </Button>
        )}
        {pasteInfo.exists && pasteInfo.pasteUrl && (
          <Button
            onClick={() => window.open(pasteInfo.pasteUrl!, '_blank')}
            variant='outline'
            color='green'
            size='compact-sm'
            leftSection={<IconExternalLink size='1rem' />}
            title={`Pasted on ${pasteInfo.pasteCreatedAt ? new Date(pasteInfo.pasteCreatedAt).toLocaleDateString() : 'Unknown date'}`}
          >
            View Paste
          </Button>
        )}
        <CopyButton value={code}>
          {({ copied, copy }) => (
            <Button
              onClick={copy}
              variant='outline'
              color={copied ? 'green' : 'gray'}
              size='compact-sm'
              leftSection={!copied ? <IconClipboardCopy size='1rem' /> : <IconCheck size='1rem' />}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          )}
        </CopyButton>
        <Button
          onClick={scrollToBottom}
          variant='outline'
          color='gray'
          size='compact-sm'
          leftSection={<IconArrowDown size='1rem' />}
          title='Scroll to bottom'
        >
          Bottom
        </Button>
      </div>
      <ScrollArea ref={scrollAreaRef} type='auto' dir='ltr' offsetScrollbars={false}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} className='theme'>
          <code className='theme' style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start' }}>
                <Text
                  component='span'
                  size='sm'
                  c='dimmed'
                  mr='md'
                  style={{
                    userSelect: 'none',
                    fontFamily: 'monospace',
                    minWidth: '3em',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {lineNumbers[i]}
                </Text>
                <span
                  className='line'
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    flex: 1,
                    overflow: 'hidden',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: language === 'none' ? line : hljs.highlight(line, { language }).value,
                  }}
                />
              </div>
            ))}
          </code>
        </pre>
      </ScrollArea>
    </Paper>
  );
}
