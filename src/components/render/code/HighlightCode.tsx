import { ActionIcon, Button, CopyButton, Paper, Text, useMantineTheme } from '@mantine/core';
import { IconCheck, IconChevronDown, IconChevronUp, IconClipboardCopy } from '@tabler/icons-react';
import type { HLJSApi } from 'highlight.js';
import { useEffect, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { highlightLines } from './highlightLines';
import './HighlightCode.theme.scss';

export default function HighlightCode({
  language,
  code,
  noClamp,
  scrollParent,
}: {
  noClamp?: boolean;
  language: string;
  code: string;
  scrollParent?: HTMLElement | null;
}) {
  const theme = useMantineTheme();
  const [expanded, setExpanded] = useState(false);
  const [hljs, setHljs] = useState<HLJSApi | null>(null);

  useEffect(() => {
    import('highlight.js').then((mod) => setHljs(mod.default || mod));
  }, []);

  const lines = code.split('\n');
  const isExpandable = !noClamp && lines.length > 50;
  const totalCount = isExpandable && !expanded ? 50 : lines.length;
  const estimatedHeight = Math.min(totalCount * 24, 400);

  const lang = useMemo(() => {
    if (!hljs) return 'plaintext';
    return hljs.getLanguage(language) ? language : 'plaintext';
  }, [hljs, language]);

  const hlLines = useMemo(() => {
    return highlightLines(code, lang, hljs);
  }, [code, hljs, lang]);

  const rowRenderer = (index: number) => (
    <div
      key={index}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        whiteSpace: 'pre',
        fontFamily: theme.fontFamilyMonospace,
        fontSize: '0.8rem',
        lineHeight: '1.5',
      }}
    >
      <Text
        component='span'
        c='dimmed'
        mr='md'
        style={{
          userSelect: 'none',
          width: 40,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {index + 1}
      </Text>

      <code
        className='theme hljs'
        style={{ flex: 1, padding: 0, background: 'none', alignSelf: 'center' }}
        dangerouslySetInnerHTML={{ __html: hlLines[index] }}
      />
    </div>
  );

  return (
    <Paper withBorder p='xs' my='md' pos='relative' style={{ overflow: 'hidden' }}>
      <CopyButton value={code}>
        {({ copied, copy }) => (
          <ActionIcon
            onClick={copy}
            variant='outline'
            color={copied ? 'green' : undefined}
            size='md'
            style={{ zIndex: 10, position: 'absolute', top: '0.5rem', right: '0.5rem' }}
          >
            {copied ? (
              <IconCheck color={theme.colors.green[4]} size='1rem' />
            ) : (
              <IconClipboardCopy size='1rem' />
            )}
          </ActionIcon>
        )}
      </CopyButton>

      <div style={{ height: noClamp ? undefined : estimatedHeight, overflowX: 'auto' }}>
        <Virtuoso
          useWindowScroll={!!noClamp && !scrollParent}
          customScrollParent={scrollParent ?? undefined}
          style={{ height: noClamp ? undefined : '100%' }}
          totalCount={totalCount}
          itemContent={rowRenderer}
          increaseViewportBy={400}
        />
      </div>

      {isExpandable && (
        <Button
          variant='light'
          size='compact-sm'
          onClick={() => setExpanded((e) => !e)}
          leftSection={expanded ? <IconChevronUp size='1rem' /> : <IconChevronDown size='1rem' />}
          style={{
            position: 'absolute',
            bottom: '0.5rem',
            right: '0.5rem',
            zIndex: 10,
          }}
        >
          {expanded ? 'Show Less' : `Show More (${lines.length - 50} more lines)`}
        </Button>
      )}
    </Paper>
  );
}
