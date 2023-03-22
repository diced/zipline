import { Code } from '@mantine/core';
import { Prism } from '@mantine/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Language } from 'prism-react-renderer';

export default function Markdown({ code, ...props }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <Prism language={match[1] as Language} {...props}>
              {String(children).replace(/\n$/, '')}
            </Prism>
          ) : (
            <Code {...props}>{children}</Code>
          );
        },
        img(props) {
          return <img {...props} style={{ maxWidth: '100%' }} />;
        },
      }}
      {...props}
    >
      {code}
    </ReactMarkdown>
  );
}
