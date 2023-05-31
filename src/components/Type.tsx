import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Group,
  Image,
  LoadingOverlay,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconFile,
  IconFileAlert,
  IconFileText,
  IconFileUnknown,
  IconHeadphones,
  IconPhotoCancel,
  IconPlayerPlay,
} from '@tabler/icons-react';
import exts from 'lib/exts';
import { useEffect, useState } from 'react';
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
  if (props.onClick)
    return (
      <UnstyledButton sx={{ height: 200 }} {...props}>
        <Center sx={{ height: 200 }}>
          <PlaceholderContent text={text} Icon={Icon} />
        </Center>
      </UnstyledButton>
    );

  return (
    <Box sx={{ height: 320 }} {...props}>
      <Center sx={{ height: 320 }}>
        <PlaceholderContent text={text} Icon={Icon} />
      </Center>
    </Box>
  );
}

function VideoThumbnailPlaceholder({ file, mediaPreview, ...props }) {
  if (!file.thumbnail || !mediaPreview)
    return <Placeholder Icon={IconPlayerPlay} text={`Click to view video (${file.name})`} {...props} />;

  return (
    <Box sx={{ position: 'relative' }}>
      <Image
        src={file.thumbnail}
        sx={{
          width: '100%',
          height: 'auto',
        }}
      />

      <Center
        sx={{
          position: 'absolute',
          height: '100%',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <IconPlayerPlay size={48} />
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
  const shouldRenderCode: boolean = Object.keys(exts).includes(file.name.split('.').pop());

  const [loading, setLoading] = useState(type === 'text' && popup);

  if ((type === 'text' || shouldRenderMarkdown || shouldRenderTex || shouldRenderCode) && popup) {
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

  if ((shouldRenderMarkdown || shouldRenderTex || shouldRenderCode) && !props.overrideRender && popup)
    return (
      <>
        {renderAlert()}
        <Card p='md' my='sm'>
          {shouldRenderMarkdown && <Markdown code={text} />}
          {shouldRenderTex && <KaTeX code={text} />}
          {shouldRenderCode && !(shouldRenderTex || shouldRenderMarkdown) && (
            <PrismCode code={text} ext={type} />
          )}
        </Card>
      </>
    );

  if (media && disableMediaPreview) {
    return <Placeholder Icon={IconFile} text={`Click to view file (${file.name})`} {...props} />;
  }

  if (file.password) {
    return (
      <Placeholder
        Icon={IconFileAlert}
        text={`This file is password protected. Click to view file (${file.name})`}
        onClick={() => window.open(file.url)}
        {...props}
      />
    );
  }

  return popup ? (
    media ? (
      {
        video: <video width='100%' autoPlay muted controls {...props} />,
        image: (
          <Image
            styles={{
              imageWrapper: {
                position: 'inherit',
              },
            }}
            placeholder={<PlaceholderContent Icon={IconPhotoCancel} text={'Image failed to load...'} />}
            {...props}
          />
        ),
        audio: <audio autoPlay muted controls {...props} style={{ width: '100%' }} />,
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
      // video: <Placeholder Icon={IconPlayerPlay} text={`Click to view video (${file.name})`} {...props} />,
      video: <VideoThumbnailPlaceholder file={file} mediaPreview={!disableMediaPreview} />,
      image: (
        <Image
          placeholder={<PlaceholderContent Icon={IconPhotoCancel} text={'Image failed to load...'} />}
          height={320}
          fit='contain'
          {...props}
        />
      ),
      audio: <Placeholder Icon={IconHeadphones} text={`Click to view audio (${file.name})`} {...props} />,
      text: <Placeholder Icon={IconFileText} text={`Click to view text file (${file.name})`} {...props} />,
    }[type]
  ) : (
    <Placeholder Icon={IconFileUnknown} text={`Click to view file (${file.name})`} {...props} />
  );
}
