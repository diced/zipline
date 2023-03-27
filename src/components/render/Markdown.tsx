import { Code } from '@mantine/core';
import { Prism } from '@mantine/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({ code, ...props }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            // @ts-ignore
            <Prism language={match[1]} {...props}>
              {String(children).replace(/\n$/, '')}
            </Prism>
          ) : (
            <Code {...props}>{children}</Code>
          );
        },
        img({ node, ...props }) {
          return <img {...props} style={{ maxWidth: '100%' }} />;
        },
      }}
      {...props}
    >
      {code}
    </ReactMarkdown>
  );
}
