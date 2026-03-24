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
import { useCallback, useEffect, useState } from 'react';
import { renderMode } from '../pages/upload/renderMode';
import Asciinema from '../render/Asciinema';
import Pdf from '../render/Pdf';
import Render from '../render/Render';
import fileIcon from './fileIcon';
import { useUserStore } from '@/lib/store/user';

const MAX_BYTES = 1 * 1024 * 1024;
const FILE_BIG = '\n...\nThe file is too big to display click the download icon to view/download it.';

function appendPassword(url: string, password?: string | null) {
  return `${url}${password ? `?pw=${encodeURIComponent(password)}` : ''}`;
}

function isDbFile(file: DbFile | File): file is DbFile {
  return typeof globalThis.File !== 'undefined' ? !(file instanceof globalThis.File) : 'thumbnail' in file;
}

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
    <Center py='xs' style={{ height: '100%', width: '100%', cursor: 'pointer' }} {...props}>
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
  password?: string | null;
  code?: boolean;
  allowZoom?: boolean;
}) {
  const user = useUserStore((state) => state.user);
  const disableMediaPreview = useSettingsStore((state) => state.settings.disableMediaPreview);
  const dbFile = isDbFile(file);

  const fileRoute = dbFile ? (user ? `/api/user/files/${file.id}/raw` : `/raw/${file.name}`) : '';

  const thumbnailRoute = dbFile
    ? file.thumbnail?.path
      ? user
        ? `/api/user/files/${file.thumbnail.path}/raw`
        : `/raw/${file.thumbnail.path}`
      : null
    : null;

  const dbFileUrl = dbFile ? appendPassword(fileRoute, password) : '';
  const [blobUrl, setBlobUrl] = useState('');

  useEffect(() => {
    if (dbFile) return setBlobUrl('');

    const objectUrl = URL.createObjectURL(file);
    setBlobUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [dbFile, file]);

  const fileUrl = dbFile ? dbFileUrl : blobUrl;

  const extension = file.name.split('.').pop() || '';
  const renderIn = renderMode(extension);
  const type = code ? 'text' : file.type.split('/')[0];

  const [fileContent, setFileContent] = useState('');
  const [open, setOpen] = useState(false);

  const getText = useCallback(async () => {
    try {
      if (!dbFile) {
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          if (content.length > MAX_BYTES) {
            setFileContent(content.slice(0, MAX_BYTES) + FILE_BIG);
          } else {
            setFileContent(content);
          }
        };
        reader.readAsText(file);
        return;
      }

      if (file.size > MAX_BYTES) {
        const res = await fetch(fileUrl, {
          headers: {
            Range: `bytes=0-${MAX_BYTES}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch file');
        const text = await res.text();
        setFileContent(text + FILE_BIG);
        return;
      }

      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error('Failed to fetch file');
      const text = await res.text();
      setFileContent(text);
    } catch {
      setFileContent('Error loading file.');
    }
  }, [dbFile, file, fileUrl]);

  useEffect(() => {
    if (type === 'text') getText();
  }, [type, getText]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
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
          onClick={() => window.open(appendPassword(`/view/${file.name}`, password))}
        />
      </Paper>
    );

  const isAsciicast = file.type === 'application/x-asciicast' || file.name.endsWith('.cast');

  switch (true) {
    case type === 'video':
      if (!fileUrl) return <Loader />;
      return show ? (
        <video
          width='100%'
          autoPlay
          muted
          controls
          src={fileUrl}
          style={{ cursor: 'pointer', maxWidth: '85vw', maxHeight: '85vh' }}
        />
      ) : thumbnailRoute ? (
        <Box pos='relative'>
          <MantineImage src={thumbnailRoute} alt={file.name || 'Video thumbnail'} />

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

    case type === 'image':
      if (!fileUrl) return <Loader />;
      return show ? (
        <Center>
          <MantineImage
            src={fileUrl}
            alt={file.name || 'Image'}
            style={{
              cursor: allowZoom ? 'zoom-in' : 'default',
              maxWidth: '70vw',
              maxHeight: '70vw',
            }}
            onClick={() => allowZoom && setOpen(true)}
          />
          {allowZoom && open && (
            <FileZoomModal setOpen={setOpen}>
              <MantineImage
                src={fileUrl}
                alt={file.name || 'Image'}
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
        <MantineImage fit='contain' mah={400} src={fileUrl} alt={file.name || 'Image'} />
      );

    case type === 'audio':
      if (!fileUrl) return <Loader />;
      return show ? (
        <audio autoPlay muted controls style={{ width: '100%' }} src={fileUrl} />
      ) : (
        <Placeholder text={`Click to play audio ${file.name}`} Icon={fileIcon(file.type)} />
      );

    case type === 'text':
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
          <Render mode={renderIn} language={extension} code={fileContent} />
        )
      ) : (
        <Placeholder text={`Click to view text ${file.name}`} Icon={fileIcon(file.type)} />
      );

    case isAsciicast === true:
      if (!fileUrl) return <Loader />;
      return show ? (
        <Asciinema src={fileUrl} />
      ) : (
        <Placeholder
          text={`Click to download asciinema cast ${file.name}`}
          Icon={fileIcon('application/x-asciicast')}
        />
      );

    case file.type === 'application/pdf':
      if (!fileUrl) return <Loader />;
      return show ? (
        <Pdf src={fileUrl} />
      ) : (
        <Placeholder text={`Click to view PDF ${file.name}`} Icon={fileIcon(file.type)} />
      );

    default:
      if (!show) return <Placeholder text={`Click to view file ${file.name}`} Icon={fileIcon(file.type)} />;

      if (show)
        return (
          <Paper withBorder p='xs' style={{ cursor: 'pointer' }}>
            <Placeholder
              onClick={() => window.open(fileUrl)}
              text={`Click to view file ${file.name} in a new tab`}
              Icon={fileIcon(file.type)}
            />
          </Paper>
        );

      return <IconFileUnknown size={48} />;
  }
}
