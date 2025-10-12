import { Button, CopyButton, Paper, ScrollArea, Text, useMantineTheme } from '@mantine/core';
import {
  IconArrowDown,
  IconCheck,
  IconClipboardCopy,
  IconExternalLink,
  IconUpload,
} from '@tabler/icons-react';
import hljs from 'highlight.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface PasteInfo {
  pasteId?: string | null;
  pasteUrl?: string | null;
  pasteCreatedAt?: Date | null;
  exists: boolean;
}

interface HighlightCodeProps {
  language: string;
  code: string;
  onUploadToPaste?: () => Promise<void>;
  isUploading?: boolean;
  fileName?: string;
  fileId?: string;
  inModal?: boolean;
}

const STICKY_OFFSET_MODAL_PX = 137; // 0.5rem assuming 16px root size
const STICKY_OFFSET_PAGE_PX = 70;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default function HighlightCode({
  language,
  code,
  onUploadToPaste,
  isUploading,
  fileName: _fileName,
  fileId,
  inModal = false,
}: HighlightCodeProps) {
  const theme = useMantineTheme();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const [pasteInfo, setPasteInfo] = useState<PasteInfo>({ exists: false });
  const [loadingPasteInfo, setLoadingPasteInfo] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  const stickyOffsetPx = inModal ? STICKY_OFFSET_MODAL_PX : STICKY_OFFSET_PAGE_PX;

  const fetchPasteInfo = useCallback(async (): Promise<PasteInfo | null> => {
    if (!fileId) {
      return null;
    }

    try {
      const response = await fetch(`/api/paste/${fileId}`, {
        credentials: 'include',
      });

      if (response.status === 404) {
        return { exists: false, pasteCreatedAt: null, pasteId: null, pasteUrl: null };
      }

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        pasteId?: string | null;
        pasteUrl?: string | null;
        pasteCreatedAt?: string | null;
        exists?: boolean;
      };

      return {
        pasteId: data.pasteId ?? null,
        pasteUrl: data.pasteUrl ?? null,
        pasteCreatedAt: data.pasteCreatedAt ? new Date(data.pasteCreatedAt) : null,
        exists: data.exists ?? Boolean(data.pasteUrl),
      };
    } catch (error) {
      console.error('Error checking paste status:', error);
      return null;
    }
  }, [fileId]);

  const refreshPasteInfo = useCallback(async () => {
    if (!fileId) {
      return;
    }

    setLoadingPasteInfo(true);
    try {
      const info = await fetchPasteInfo();
      if (info) {
        setPasteInfo(info);
      }
    } finally {
      setLoadingPasteInfo(false);
    }
  }, [fetchPasteInfo, fileId]);

  useEffect(() => {
    let active = true;

    if (!fileId) {
      setPasteInfo({ exists: false });
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoadingPasteInfo(true);
      try {
        const info = await fetchPasteInfo();
        if (active && info) {
          setPasteInfo(info);
        }
      } finally {
        if (active) {
          setLoadingPasteInfo(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [fetchPasteInfo, fileId]);

  const handleUploadToPasteClick = useCallback(async () => {
    if (!onUploadToPaste) {
      return;
    }

    await onUploadToPaste();
    await refreshPasteInfo();
  }, [onUploadToPaste, refreshPasteInfo]);

  useEffect(() => {
    let rafId: number | null = null;

    const updateStickyState = () => {
      const node = actionsRef.current;
      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const threshold = stickyOffsetPx + 1;
      const next = rect.top <= threshold;

      setIsSticky((prev) => (prev === next ? prev : next));
    };

    const scheduleUpdate = () => {
      if (rafId !== null) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateStickyState();
      });
    };

    const handleScroll = () => {
      scheduleUpdate();
    };

    const handleResize = () => {
      scheduleUpdate();
    };

    updateStickyState();
    scheduleUpdate();

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('resize', handleResize, { passive: true });

    const observers: ResizeObserver[] = [];
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => scheduleUpdate());
      if (paperRef.current) {
        resizeObserver.observe(paperRef.current);
      }
      if (scrollAreaRef.current) {
        resizeObserver.observe(scrollAreaRef.current);
      }
      observers.push(resizeObserver);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      observers.forEach((observer) => observer.disconnect());
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [stickyOffsetPx]);

  const scrollToBottom = useCallback(() => {
    const viewport =
      (scrollAreaRef.current?.querySelector('[data-mantine-scroll-area="viewport"]') as HTMLElement | null) ??
      (scrollAreaRef.current?.querySelector('[data-scroll-area="viewport"]') as HTMLElement | null);

    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    } else if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }

    const lastElement = paperRef.current?.querySelector('code > div:last-child') as HTMLElement | null;
    if (lastElement) {
      lastElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  const plainLines = useMemo(() => code.split('\n'), [code]);
  const lineNumbers = useMemo(() => plainLines.map((_, index) => index + 1), [plainLines]);

  const highlightedLanguage = useMemo(() => {
    if (!language || language === 'none') {
      return null;
    }

    return hljs.getLanguage(language) ? language : 'plaintext';
  }, [language]);

  const highlightedLines = useMemo(() => {
    if (!highlightedLanguage) {
      return plainLines.map(escapeHtml);
    }

    try {
      const { value } = hljs.highlight(code, { language: highlightedLanguage });
      const splitHighlighted = value.split('\n');
      return plainLines.map((_, index) => splitHighlighted[index] ?? '');
    } catch (error) {
      console.error('Error highlighting code:', error);
      return plainLines.map(escapeHtml);
    }
  }, [code, highlightedLanguage, plainLines]);

  return (
    <Paper
      ref={paperRef}
      withBorder
      p='xs'
      my='md'
      pos='relative'
      style={{
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div
        ref={actionsRef}
        style={{
          position: 'sticky',
          top: inModal ? '4.5rem' : '4.175rem',
          alignSelf: 'flex-end',
          display: 'flex',
          gap: '0.5rem',
          padding: '0.25rem', 
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          border: inModal ? isSticky ? 'transparent' : `1px solid ${theme.colors.dark[4]}` : '',
          borderRadius: theme.radius.md,
          pointerEvents: 'auto',
          backgroundColor: isSticky ? 'transparent' : theme.colors.dark[7] ,
          zIndex: inModal ? 1000 : 200,
          transition: 'opacity 0.3s ease, transform 0.3s ease, box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease',
        }}
      >

        <Text
          size='sm'
          c='dimmed'
          style={{
            fontFamily: 'monospace',
            opacity: isSticky ? 0 : 1,
            padding: '0.25rem',
          }}
        >
          {code.length} characters
        </Text>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.25rem',
          borderRadius: '10px',
          backgroundColor: isSticky ? 'rgba(61, 61, 61, 0.5)' : 'transparent',
          transition: 'all 0.2s ease',
        }}>

          {onUploadToPaste && !pasteInfo.exists && (
            <Button
              onClick={handleUploadToPasteClick}
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
              title={
                pasteInfo.pasteCreatedAt
                  ? `Pasted on ${pasteInfo.pasteCreatedAt.toLocaleString()}`
                  : undefined
              }
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
                leftSection={
                  copied ? <IconCheck size='1rem' /> : <IconClipboardCopy size='1rem' />
                }
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
      </div>

      <ScrollArea
        ref={scrollAreaRef}
        type='auto'
        dir='ltr'
        offsetScrollbars={false}
        style={{ overflow: 'hidden' }}
      >
        <pre style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          borderRadius: theme.radius.sm,
        }} className='theme'>
          <code className='theme' style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {plainLines.map((_, index) => {
              const isFirst = index === 0;
              const isLast = index === plainLines.length - 1;

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    paddingTop: isFirst ? '0.5rem' : 0,
                    paddingBottom: isLast ? '0.5rem' : 0,
                  }}
                >
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
                    {lineNumbers[index]}
                  </Text>
                  <span
                    className='line'
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      flex: 1,
                      overflow: 'visible',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: highlightedLines[index] ?? '',
                    }}
                  />
                </div>
              );
            })}
          </code>
        </pre>
      </ScrollArea>
    </Paper>
  );
}
