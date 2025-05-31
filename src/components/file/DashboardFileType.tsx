import type { File as DbFile } from '@/lib/db/models/file';
import { useSettingsStore } from '@/lib/store/settings';
import {
  Box,
  Center,
  Loader,
  LoadingOverlay,
  Image as MantineImage,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import { Icon, IconFileUnknown, IconPlayerPlay, IconShieldLockFilled } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { renderMode } from '../pages/upload/renderMode';
import Render from '../render/Render';
import fileIcon from './fileIcon';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

function PlaceholderContent({ text, Icon }: { text: string; Icon: Icon }) {
  return (
    <Stack align='center'>
      <Icon size='4rem' stroke={2} style={{ filter: 'drop-shadow(0 0 10px rgba(0, 0, 0, 0.9))' }} />
      <Text size='md' ta='center'>
        {text}
      </Text>
    </Stack>
  );
}

function Placeholder({ text, Icon, ...props }: { text: string; Icon: Icon; onClick?: () => void }) {
  return (
    <Center py='xs' style={{ height: '100%', width: '100%', cursor: 'pointed' }} {...props}>
      <PlaceholderContent text={text} Icon={Icon} />
    </Center>
  );
}

function FileZoomModal({
  setOpen,
  children,
}: {
  setOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={() => setOpen(false)}
    >
      {children}
    </div>
  );
}

export default function DashboardFileType({
  file,
  show,
  password,
  code,
  allowZoom,
}: {
  file: DbFile | File;
  show?: boolean;
  password?: string;
  code?: boolean;
  allowZoom?: boolean;
}) {
  const [overrideType] = useQueryState('otype', parseAsStringLiteral(['video', 'audio', 'image', 'text']));

  const disableMediaPreview = useSettingsStore((state) => state.settings.disableMediaPreview);

  const dbFile = 'id' in file;
  const renderIn = renderMode(file.name.split('.').pop() || '');

  const [fileContent, setFileContent] = useState('');
  const [type, setType] = useState<string>(file.type.split('/')[0]);

  const [open, setOpen] = useState(false);

  const gettext = async () => {
    if (!dbFile) {
      const reader = new FileReader();
      reader.onload = () => {
        if ((reader.result! as string).length > 1 * 1024 * 1024) {
          setFileContent(
            reader.result!.slice(0, 1 * 1024 * 1024) +
              '\n...\nThe file is too big to display click the download icon to view/download it.',
          );
        } else {
          setFileContent(reader.result as string);
        }
      };
      reader.readAsText(file);

      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      const res = await fetch(`/raw/${file.name}${password ? `?pw=${password}` : ''}`, {
        headers: {
          Range: 'bytes=0-' + 1 * 1024 * 1024, // 0 mb to 1 mb
        },
      });

      const text = await res.text();
      setFileContent(
        text + '\n...\nThe file is too big to display click the download icon to view/download it.',
      );
      return;
    }

    const res = await fetch(`/raw/${file.name}${password ? `?pw=${password}` : ''}`);
    const text = await res.text();

    setFileContent(text);
  };

  useEffect(() => {
    if (code) {
      setType('text');
      gettext();
    } else if (overrideType === 'text' || type === 'text') {
      gettext();
    } else {
      return;
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [open]);

  if (disableMediaPreview && !show)
    return <Placeholder text={`Click to view file ${file.name}`} Icon={fileIcon(file.type)} />;

  if (dbFile && file.password === true && !show)
    return <Placeholder text={`Click to view protected ${file.name}`} Icon={IconShieldLockFilled} />;

  if (dbFile && file.password === true && show)
    return (
      <Paper withBorder p='xs' style={{ cursor: 'pointer' }}>
        <Placeholder
          text={`Click to view protected ${file.name}`}
          Icon={IconShieldLockFilled}
          onClick={() => window.open(`/view/${file.name}${password ? `?pw=${password}` : ''}`)}
        />
      </Paper>
    );

  switch (overrideType || type) {
    case 'video':
      return show ? (
        <video
          width='100%'
          autoPlay
          muted
          controls
          src={dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)}
          style={{ cursor: 'pointer', maxWidth: '85vw', maxHeight: '85vh' }}
        />
      ) : (file as DbFile).thumbnail && dbFile ? (
        <Box pos='relative'>
          <MantineImage src={`/raw/${(file as DbFile).thumbnail!.path}`} alt={file.name} />

          <Center
            pos='absolute'
            h='100%'
            top='50%'
            left='50%'
            style={{
              transform: 'translate(-50%, -50%)',
            }}
          >
            <IconPlayerPlay
              size='4rem'
              stroke={3}
              style={{ filter: 'drop-shadow(0 0 10px rgba(0, 0, 0, 0.9))' }}
            />
          </Center>
        </Box>
      ) : (
        <Placeholder text={`Click to play video ${file.name}`} Icon={fileIcon(file.type)} />
      );
    case 'image':
      return show ? (
        <Center>
          <MantineImage
            src={dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)}
            alt={file.name}
            style={{
              cursor: allowZoom ? 'zoom-in' : 'default',
              maxWidth: '70vw',
              maxHeight: '70vw',
            }}
            onClick={() => setOpen(true)}
          />
          {allowZoom && open && (
            <FileZoomModal setOpen={setOpen}>
              <MantineImage
                src={
                  dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)
                }
                alt={file.name}
                style={{
                  maxWidth: '95vw',
                  maxHeight: '95vh',
                  objectFit: 'contain',
                  cursor: 'zoom-out',
                  width: 'auto',
                }}
              />
            </FileZoomModal>
          )}
        </Center>
      ) : (
        <MantineImage
          fit='contain'
          mah={400}
          src={dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)}
          alt={file.name}
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
        <Placeholder text={`Click to play audio ${file.name}`} Icon={fileIcon(file.type)} />
      );
    case 'text':
      return show ? (
        fileContent.trim() === '' ? (
          <LoadingOverlay
            visible={fileContent.trim() === ''}
            loaderProps={{
              children: (
                <>
                  <Center>
                    <Loader />
                  </Center>
                  <Text ta='center' mt='xs' c='dimmed'>
                    Loading file...
                  </Text>
                </>
              ),
            }}
          />
        ) : (
          <Render mode={renderIn} language={file.name.split('.').pop() || ''} code={fileContent} />
        )
      ) : (
        <Placeholder text={`Click to view text ${file.name}`} Icon={fileIcon(file.type)} />
      );
    default:
      if (dbFile && !show)
        return <Placeholder text={`Click to view file ${file.name}`} Icon={fileIcon(file.type)} />;

      if (dbFile && show)
        return (
          <Paper withBorder p='xs' style={{ cursor: 'pointer' }}>
            <Placeholder
              onClick={() => window.open(`/raw/${file.name}${password ? `?pw=${password}` : ''}`)}
              text={`Click to view file ${file.name} in a new tab`}
              Icon={fileIcon(file.type)}
            />
          </Paper>
        );
      else return <IconFileUnknown size={48} />;
  }
}
