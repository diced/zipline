import { ActionIcon, Button, CopyButton, Paper, ScrollArea, Text, useMantineTheme } from '@mantine/core';
import { IconCheck, IconChevronDown, IconChevronUp, IconClipboardCopy } from '@tabler/icons-react';
import type { HLJSApi } from 'highlight.js';
import { useEffect, useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';

import { useLocation } from 'react-router-dom';
import './HighlightCode.theme.scss';
import * as sanitize from 'isomorphic-dompurify';

export default function HighlightCode({ language, code }: { language: string; code: string }) {
  const { pathname } = useLocation();
  const noClamp = pathname.startsWith('/view/');

  const theme = useMantineTheme();
  const [expanded, setExpanded] = useState(false);
  const [hljs, setHljs] = useState<HLJSApi | null>(null);

  useEffect(() => {
    import('highlight.js').then((mod) => setHljs(mod.default || mod));
  }, []);

  const lines = useMemo(() => code.split('\n'), [code]);
  const visible = expanded || noClamp ? lines.length : Math.min(lines.length, 50);
  const expandable = !noClamp && lines.length > 50;

  const lang = useMemo(() => {
    if (!hljs) return 'plaintext';
    if (hljs.getLanguage(language)) return language;

    return 'plaintext';
  }, [hljs, language]);

  const hlLines = useMemo(() => {
    if (!hljs) return lines;

    return lines.map(
      (line) =>
        hljs.highlight(line, {
          language: lang,
        }).value,
    );
  }, [lines, hljs, lang]);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'flex-start',
        whiteSpace: 'pre',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
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
        style={{ flex: 1, fontSize: '0.8rem' }}
        dangerouslySetInnerHTML={{
          __html: sanitize.sanitize(hlLines[index], { USE_PROFILES: { html: true } }),
        }}
      />
    </div>
  );

  return (
    <Paper withBorder p='xs' my='md' pos='relative'>
      <CopyButton value={code}>
        {({ copied, copy }) => (
          <ActionIcon
            onClick={copy}
            variant='outline'
            color={copied ? 'green' : 'gray'}
            size='md'
            style={{ zIndex: 4, position: 'absolute', top: '0.5rem', right: '0.5rem' }}
          >
            {!copied ? (
              <IconClipboardCopy size='1rem' />
            ) : (
              <IconCheck color={theme.colors.green[4]} size='1rem' />
            )}
          </ActionIcon>
        )}
      </CopyButton>

      {noClamp ? (
        <ScrollArea type='auto' offsetScrollbars={false}>
          <div>
            {hlLines.map((_, index) => (
              <Row key={index} index={index} style={{}} />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea type='auto' offsetScrollbars={false} style={{ maxHeight: 400 }}>
          <List height={400} width='100%' itemCount={visible} itemSize={20} overscanCount={10}>
            {Row}
          </List>
        </ScrollArea>
      )}

      {expandable && (
        <Button
          variant='light'
          size='compact-sm'
          onClick={() => setExpanded((e) => !e)}
          leftSection={expanded ? <IconChevronUp size='1rem' /> : <IconChevronDown size='1rem' />}
          style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem' }}
        >
          {expanded ? 'Show Less' : `Show More (${lines.length - 50} more lines)`}
        </Button>
      )}
    </Paper>
  );
}
