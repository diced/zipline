import { Alert } from '@mantine/core';
import katex, { ParseError } from 'katex';
import { useEffect, useState } from 'react';

import 'katex/dist/katex.min.css';

const sanitize = (str: string) => {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

export default function KaTeX({ code, ...props }) {
  const [rendered, setRendered] = useState('');
  const [error, setError] = useState<JSX.Element>();

  const renderError = (error: ParseError | TypeError) => {
    return (
      <Alert title={error.name} color='red'>
        {sanitize(error.message)}
      </Alert>
    );
  };

  useEffect(() => {
    try {
      const html = katex.renderToString(code, {
        displayMode: true,
        throwOnError: true,
        errorColor: '#f44336',
      });

      setRendered(html);
    } catch (e) {
      if (e instanceof Error) {
        setError(renderError(e));
      } else {
        throw e;
      }
    }
  }, [rendered, error, code]);

  if (error) return error;

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: rendered,
      }}
      {...props}
    />
  );
}
