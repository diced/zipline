import type { File as DbFile } from '@/lib/db/models/file';
import { Box, Center, Image, Paper, Stack, Text } from '@mantine/core';
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
import { useSettingsStore } from '@/lib/store/settings';

function PlaceholderContent({ text, Icon }: { text: string; Icon: Icon }) {
  return (
    <Stack align='center'>
      <Icon size={48} />
      <Text size='md' align='center'>
        {text}
      </Text>
    </Stack>
  );
}

function Placeholder({ text, Icon, ...props }: { text: string; Icon: Icon; onClick?: () => void }) {
  return (
    <Center sx={{ height: '100%', width: '100%', cursor: 'pointed' }} {...props}>
      <PlaceholderContent text={text} Icon={Icon} />
    </Center>
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
  code,
}: {
  file: DbFile | File;
  show?: boolean;
  password?: string;
  code?: boolean;
}) {
  const disableMediaPreview = useSettingsStore((state) => state.settings.disableMediaPreview);

  const dbFile = 'id' in file;
  const renderIn = renderMode(file.name.split('.').pop() || '');

  const [fileContent, setFileContent] = useState('');
  const [type, setType] = useState(file.type.split('/')[0]);

  const gettext = async () => {
    const res = await fetch(`/raw/${file.name}${password ? `?pw=${password}` : ''}`);
    const text = await res.text();

    setFileContent(text);
  };

  useEffect(() => {
    if (code) {
      setType('text');
      gettext();
    } else if (type === 'text') {
      gettext();
    } else {
      return;
    }
  }, []);

  if (disableMediaPreview && !show)
    // @ts-ignore
    return <Placeholder text={`Click to view file ${file.name}`} Icon={icon[type] ?? IconFileUnknown} />;

  if (dbFile && file.password === true && !show)
    return (
      <Placeholder
        text={`Click to view protected ${file.name}`}
        Icon={IconShieldLockFilled}
        onClick={() => window.open(`/view/${file.name}${password ? `?pw=${password}` : ''}`)}
      />
    );

  if (dbFile && file.password === true && show)
    return (
      <Paper withBorder p='xs' sx={{ cursor: 'pointer' }}>
        <Placeholder
          text={`Click to view protected ${file.name}`}
          Icon={IconShieldLockFilled}
          onClick={() => window.open(`/view/${file.name}${password ? `?pw=${password}` : ''}`)}
        />
      </Paper>
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
      ) : (file as DbFile).thumbnail && dbFile ? (
        <Box>
          <Image
            styles={{
              imageWrapper: {
                position: 'inherit',
              },
              image: {
                maxHeight: dbFile ? '100vh' : 100,
              },
            }}
            src={`/raw/${(file as DbFile).thumbnail.path}`}
            alt={file.name}
          />

          <Center
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <IconPlayerPlay size='4rem' stroke={3} />
          </Center>
        </Box>
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
      if (dbFile && !show)
        return <Placeholder text={`Click to view file ${file.name}`} Icon={IconFileUnknown} />;

      if (dbFile && show)
        return (
          <Paper withBorder p='xs' sx={{ cursor: 'pointer' }}>
            <Placeholder
              onClick={() => window.open(`/raw/${file.name}${password ? `?pw=${password}` : ''}`)}
              text={`Click to view file ${file.name} in a new tab`}
              Icon={IconFileUnknown}
            />
          </Paper>
        );
      else return <IconFileUnknown size={48} />;
  }
}
