import { ActionIcon, Button, CopyButton, Paper, ScrollArea, Text, useMantineTheme } from '@mantine/core';
import { IconCheck, IconClipboardCopy, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import hljs from 'highlight.js';
import { useState } from 'react';

export default function HighlightCode({ language, code }: { language: string; code: string }) {
  const theme = useMantineTheme();
  const [expanded, setExpanded] = useState(false);

  const lines = code.split('\n');
  const lineNumbers = lines.map((_, i) => i + 1);
  const displayLines = expanded ? lines : lines.slice(0, 50);
  const displayLineNumbers = expanded ? lineNumbers : lineNumbers.slice(0, 50);

  if (!hljs.getLanguage(language)) {
    language = 'text';
  }

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
        <pre style={{ margin: 0 }} className='theme'>
          <code className='theme'>
            {displayLines.map((line, i) => (
              <div key={i}>
                <Text
                  component='span'
                  size='sm'
                  c='dimmed'
                  mr='md'
                  style={{ userSelect: 'none', fontFamily: 'monospace' }}
                >
                  {displayLineNumbers[i]}
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

      {lines.length > 50 && (
        <Button
          variant='outline'
          size='compact-sm'
          onClick={() => setExpanded(!expanded)}
          leftSection={expanded ? <IconChevronUp size='1rem' /> : <IconChevronDown size='1rem' />}
          style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem' }}
        >
          {expanded ? 'Show Less' : `Show More (${lines.length - 50} more lines)`}
        </Button>
      )}
    </Paper>
  );
}
