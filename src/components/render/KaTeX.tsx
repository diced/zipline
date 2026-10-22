import { useEffect, useState } from 'react';

import 'katex/dist/katex.min.css';
import { Alert, Box, Paper } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export default function KaTeX({ tex, unframed }: { tex: string; unframed?: boolean }) {
  const { t } = useTranslation('file');
  const [html, setHtml] = useState('');
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    import('katex').then(({ default: { renderToString } }) => {
      try {
        const html = renderToString(tex, { throwOnError: true });
        setHtml(html);
      } catch (err) {
        setError(err);
      }
    });
  }, [tex]);

  if (error) {
    return (
      <Alert color='red' title={t('render.katexError')}>
        {error.toString()}
      </Alert>
    );
  }

  const Container = unframed ? Box : Paper;

  return (
    <Container {...(!unframed && { withBorder: true })} p='md'>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </Container>
  );
}
