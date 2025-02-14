import { Code } from '@mantine/core';
import { Prism } from '@mantine/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Language } from 'prism-react-renderer';

export default function Markdown({ code, ...props }) {
  return (
    <ReactMarkdown
      remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
      components={{
        code({ children }) {
          return <Code>{children}</Code>;
        },
        pre({ children }) {
          // @ts-expect-error someone find the type for this :sob:
          const match = /language-(\w+)/.exec(children.props?.className || '');
          // @ts-ignore
          if (!children.props?.children) return code;
          return (
            <Prism language={match ? (match[1] as Language) : 'markdown'}>
              {
                // @ts-expect-error
                String(children.props?.children).replace(/\n$/, '')
              }
            </Prism>
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
