import { Alert, Box, Button, Card, Center, Group, Image, LoadingOverlay, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { AudioIcon, FileIcon, ImageIcon, PlayIcon } from './icons';
import KaTeX from './render/KaTeX';
import Markdown from './render/Markdown';
import PrismCode from './render/PrismCode';

function PlaceholderContent({ text, Icon }) {
  return (
    <Group sx={(t) => ({ color: t.colors.dark[2] })}>
      <Icon size={48} />
      <Text size='md'>{text}</Text>
    </Group>
  );
}

function Placeholder({ text, Icon, ...props }) {
  return (
    <Box sx={{ height: 200 }} {...props}>
      <Center sx={{ height: 200 }}>
        <PlaceholderContent text={text} Icon={Icon} />
      </Center>
    </Box>
  );
}

export default function Type({ file, popup = false, disableMediaPreview, ...props }) {
  const type =
    (file.type ?? file.mimetype) === ''
      ? file.name.split('.').pop()
      : (file.type ?? file.mimetype).split('/')[0];

  const media = /^(video|audio|image|text)/.test(type);

  const [text, setText] = useState('');
  const shouldRenderMarkdown = file.name.endsWith('.md');
  const shouldRenderTex = file.name.endsWith('.tex');

  const [loading, setLoading] = useState(type === 'text' && popup);

  if (type === 'text' && popup) {
    useEffect(() => {
      (async () => {
        const res = await fetch('/r/' + file.name);
        const text = await res.text();

        setText(text);
        setLoading(false);
      })();
    }, []);
  }

  const renderAlert = () => {
    return (
      <Alert color='blue' variant='outline' sx={{ width: '100%' }}>
        You are{props.overrideRender ? ' not ' : ' '}viewing a rendered version of the file
        <Button
          mx='md'
          onClick={() => props.setOverrideRender(!props.overrideRender)}
          compact
          variant='light'
        >
          View {props.overrideRender ? 'rendered' : 'raw'}
        </Button>
      </Alert>
    );
  };

  if ((shouldRenderMarkdown || shouldRenderTex) && !props.overrideRender && popup)
    return (
      <>
        {renderAlert()}
        <Card p='md' my='sm'>
          {shouldRenderMarkdown && <Markdown code={text} />}
          {shouldRenderTex && <KaTeX code={text} />}
        </Card>
      </>
    );

  if (media && disableMediaPreview) {
    return <Placeholder Icon={FileIcon} text={`Click to view file (${file.name})`} {...props} />;
  }

  return popup ? (
    media ? (
      {
        video: <video width='100%' autoPlay controls {...props} />,
        image: (
          <Image
            placeholder={<PlaceholderContent Icon={FileIcon} text={'Image failed to load...'} />}
            {...props}
          />
        ),
        audio: <audio autoPlay controls {...props} style={{ width: '100%' }} />,
        text: (
          <>
            {loading ? (
              <LoadingOverlay visible={loading} />
            ) : (
              <>
                {(shouldRenderMarkdown || shouldRenderTex) && renderAlert()}
                <PrismCode code={text} ext={file.name.split('.').pop()} {...props} />
              </>
            )}
          </>
        ),
      }[type]
    ) : (
      <Text>Can&apos;t preview {file.type || file.mimetype}</Text>
    )
  ) : media ? (
    {
      video: <Placeholder Icon={PlayIcon} text={`Click to view video (${file.name})`} {...props} />,
      image: (
        <Image
          placeholder={<PlaceholderContent Icon={ImageIcon} text={'Image failed to load...'} />}
          {...props}
        />
      ),
      audio: <Placeholder Icon={AudioIcon} text={`Click to view audio (${file.name})`} {...props} />,
      text: <Placeholder Icon={FileIcon} text={`Click to view text file (${file.name})`} {...props} />,
    }[type]
  ) : (
    <Placeholder Icon={FileIcon} text={`Click to view file (${file.name})`} {...props} />
  );
}
