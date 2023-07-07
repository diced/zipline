import type { File as DbFile } from '@/lib/db/models/file';
import { Box, Center, Group, Image, Text, UnstyledButton } from '@mantine/core';
import {
  Icon,
  IconFileText,
  IconFileUnknown,
  IconMusic,
  IconPhoto,
  IconPhotoCancel,
  IconPlayerPlay,
  IconShieldLockFilled,
  IconVideo,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { renderMode } from '../pages/upload/renderMode';
import Render from '../render/Render';

function PlaceholderContent({ text, Icon }: { text: string; Icon: Icon }) {
  return (
    <Group sx={(t) => ({ color: t.colors.dark[2] })}>
      <Icon size={48} />
      <Text size='md'>{text}</Text>
    </Group>
  );
}

function Placeholder({ text, Icon, ...props }: { text: string; Icon: Icon; onClick?: () => void }) {
  if (props.onClick)
    return (
      <Box sx={{ height: 200, cursor: 'pointer' }} {...props}>
        <Center sx={{ height: 200 }}>
          <PlaceholderContent text={text} Icon={Icon} />
        </Center>
      </Box>
    );

  return (
    <Box sx={{ height: 320 }} {...props}>
      <Center sx={{ height: 320 }}>
        <PlaceholderContent text={text} Icon={Icon} />
      </Center>
    </Box>
  );
}

const icon = {
  video: IconVideo,
  image: IconPhoto,
  audio: IconMusic,
  text: IconFileText,
};

export default function DashboardFileType({
  file,
  show,
  password,
  disableMediaPreview,
}: {
  file: DbFile | File;
  show?: boolean;
  password?: string;
  disableMediaPreview?: boolean;
}) {
  const type = file.type.split('/')[0];
  const dbFile = 'id' in file;
  const renderIn = renderMode(file.name.split('.').pop() || '');

  const [fileContent, setFileContent] = useState('');

  useEffect(() => {
    if (type !== 'text') return;

    (async () => {
      const res = await fetch(`/raw/${file.name}${password ? `?pw=${password}` : ''}`);
      const text = await res.text();

      setFileContent(text);
    })();
  }, []);

  if (disableMediaPreview)
    // @ts-ignore
    return <Placeholder text={`Click to view file ${file.name}`} Icon={icon[type] ?? IconFileUnknown} />;

  if (dbFile && file.password === true)
    return (
      <Placeholder
        text={`Click to view protected ${file.name}`}
        Icon={IconShieldLockFilled}
        onClick={() => window.open(`/view/${file.name}${password ? `?pw=${password}` : ''}`)}
      />
    );

  switch (type) {
    case 'video':
      return show ? (
        <video
          width='100%'
          autoPlay
          muted
          controls
          src={dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)}
        />
      ) : (
        <Placeholder text={`Click to play video ${file.name}`} Icon={IconPlayerPlay} />
      );
    case 'image':
      return (
        <Image
          styles={{
            imageWrapper: {
              position: 'inherit',
            },
            image: {
              maxHeight: dbFile ? '100vh' : 100,
            },
          }}
          placeholder={<PlaceholderContent Icon={IconPhotoCancel} text={'Image failed to load...'} />}
          src={dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)}
          alt={file.name}
          width={show ? 'auto' : undefined}
        />
      );
    case 'audio':
      return show ? (
        <audio
          autoPlay
          muted
          controls
          style={{ width: '100%' }}
          src={dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)}
        />
      ) : (
        <Placeholder text={`Click to play audio ${file.name}`} Icon={IconPlayerPlay} />
      );
    case 'text':
      return show ? (
        <Render mode={renderIn} language={file.name.split('.').pop() || ''} code={fileContent} />
      ) : (
        <Placeholder text={`Click to view text ${file.name}`} Icon={IconFileText} />
      );
    default:
      if (dbFile) return <Placeholder text={`Click to view file ${file.name}`} Icon={IconFileUnknown} />;
      else return <IconFileUnknown size={48} />;
  }
}
