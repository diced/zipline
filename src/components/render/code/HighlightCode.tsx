import { ActionIcon, CopyButton, Paper, ScrollArea, Text, useMantineTheme } from '@mantine/core';
import { IconCheck, IconClipboardCopy } from '@tabler/icons-react';
import hljs from 'highlight.js';

import styles from './HighlightCode.theme.module.css';

export default function HighlightCode({ language, code }: { language: string; code: string }) {
  const theme = useMantineTheme();

  const lines = code.split('\n').filter((line) => line !== '');
  const lineNumbers = lines.map((_, i) => i + 1);

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

      <ScrollArea type='auto' dir='ltr' offsetScrollbars={false}>
        <pre style={{ margin: 0 }} className={styles.theme}>
          <code className={styles.theme}>
            {lines.map((line, i) => (
              <div key={i}>
                <Text
                  component='span'
                  size='sm'
                  c='dimmed'
                  mr='md'
                  style={{ userSelect: 'none', fontFamily: 'monospace' }}
                >
                  {lineNumbers[i]}
                </Text>
                <span
                  className='line'
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
