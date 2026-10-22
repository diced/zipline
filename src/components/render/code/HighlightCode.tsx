import {
  ActionIcon,
  Box,
  Button,
  CopyButton,
  Paper,
  Text,
  useComputedColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { IconCheck, IconChevronDown, IconChevronUp, IconClipboardCopy } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import type { highlight } from './highlight';

export default function HighlightCode({
  language,
  code,
  noClamp,
  scrollParent,
  unframed,
}: {
  noClamp?: boolean;
  language: string;
  code: string;
  scrollParent?: HTMLElement | null;
  unframed?: boolean;
}) {
  const { t } = useTranslation('file');
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme('light');
  const [expanded, setExpanded] = useState(false);
  const [highlighted, setHighlighted] = useState<{
    code: string;
    language: string;
    colorScheme: 'light' | 'dark';
    tokens: Awaited<ReturnType<typeof highlight>>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    import('./highlight')
      .then(({ highlight }) => (cancelled ? null : highlight(code, language, colorScheme)))
      .then((tokens) => {
        if (!cancelled) setHighlighted({ code, language, colorScheme, tokens });
      })
      .catch((error) => {
        if (!cancelled) console.error('Failed to highlight code', error);
      });

    return () => {
      cancelled = true;
    };
  }, [code, language, colorScheme]);

  const lines = useMemo(() => code.split('\n'), [code]);
  const isExpandable = !noClamp && lines.length > 50;
  const totalCount = isExpandable && !expanded ? 50 : lines.length;
  const estimatedHeight = Math.min(totalCount * 24, 400);

  const tokens =
    highlighted?.code === code && highlighted.language === language && highlighted.colorScheme === colorScheme
      ? highlighted.tokens
      : null;

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

      <code style={{ flex: 1, padding: 0, background: 'none', alignSelf: 'center' }}>
        {tokens
          ? tokens[index]?.map((token, tokenIndex) => (
              <span
                key={tokenIndex}
                style={{
                  color: token.color,
                  backgroundColor: token.bgColor,
                  fontStyle: (token.fontStyle ?? 0) & 1 ? 'italic' : undefined,
                  fontWeight: (token.fontStyle ?? 0) & 2 ? 'bold' : undefined,
                  textDecoration: (token.fontStyle ?? 0) & 4 ? 'underline' : undefined,
                }}
              >
                {token.content}
              </span>
            ))
          : lines[index]}
      </code>
    </div>
  );

  const Container = unframed ? Box : Paper;

  return (
    <Container
      {...(!unframed && { withBorder: true })}
      p='xs'
      my={unframed ? 0 : 'md'}
      pos='relative'
      style={{ overflow: 'hidden' }}
    >
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
          {expanded ? t('render.showLess') : t('render.showMore', { count: lines.length - 50 })}
        </Button>
      )}
    </Container>
  );
}
