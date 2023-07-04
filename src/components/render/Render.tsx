import { RenderMode } from '@/components/pages/upload/renderMode';
import { Alert, Button } from '@mantine/core';
import { IconEyeFilled } from '@tabler/icons-react';
import { useState } from 'react';
import KaTeX from './KaTeX';
import Markdown from './Markdown';
import HighlightCode from './code/HighlightCode';

export function RenderAlert({
  renderer,
  state,
  change,
}: {
  renderer: string;
  state: boolean;
  change: (s: boolean) => void;
}) {
  return (
    <Alert color='gray' icon={<IconEyeFilled size='1rem' />} variant='outline' my='sm'>
      {!state ? `This file is rendered through ${renderer}` : `This file can be rendered through ${renderer}`}
      <Button
        mx='sm'
        variant='outline'
        compact
        onClick={() => change(!state)}
        color='gray'
        pos='absolute'
        right={0}
      >
        {state ? 'Show' : 'Hide'} rendered version
      </Button>
    </Alert>
  );
}

export default function Render({
  mode,
  language,
  code,
}: {
  mode: RenderMode;
  language: string;
  code: string;
}) {
  const [highlight, setHighlight] = useState(false);

  switch (mode) {
    case RenderMode.Katex:
      return (
        <>
          <RenderAlert renderer='KaTeX' state={highlight} change={(s) => setHighlight(s)} />

          {highlight ? <HighlightCode language={language} code={code} /> : <KaTeX tex={code} />}
        </>
      );
    case RenderMode.Markdown:
      return (
        <>
          <RenderAlert renderer='Markdown' state={highlight} change={(s) => setHighlight(s)} />

          {highlight ? <HighlightCode language={language} code={code} /> : <Markdown md={code} />}
        </>
      );
    default:
      return <HighlightCode language={language} code={code} />;
  }
}
