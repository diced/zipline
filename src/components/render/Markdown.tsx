import { Box, Paper, Typography } from '@mantine/core';
import Marked from 'marked-react';
import HighlightCode from './code/HighlightCode';

const components = {
  code(value: string, language?: string) {
    return <HighlightCode code={value} language={language ?? 'text'} />;
  },
};

export default function Markdown({ md, unframed }: { md: string; unframed?: boolean }) {
  const Container = unframed ? Box : Paper;

  return (
    <Container {...(!unframed && { withBorder: true })} p='md'>
      <Typography>
        <Marked value={md} gfm renderer={components} />
      </Typography>
    </Container>
  );
}
