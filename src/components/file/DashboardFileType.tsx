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
import { useClipboard } from '@mantine/hooks';
import { Icon, IconFileUnknown, IconPlayerPlay, IconShieldLockFilled, IconPhoto } from '@tabler/icons-react';
import { showNotification, updateNotification } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { renderMode } from '../pages/upload/renderMode';
import Render from '../render/Render';
import fileIcon from './fileIcon';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

function ImageWithFallback({
  src,
  alt,
  style,
  onClick,
  fileName,
  isModal = false,
  ...props
}: {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  onClick?: (e?: React.MouseEvent) => void;
  fileName?: string;
  isModal?: boolean;
  [key: string]: any;
}) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    const errorStyle = {
      ...style,
      minHeight: isModal ? '400px' : '200px',
      minWidth: isModal ? '500px' : 'auto',
      width: isModal ? '40vw' : style?.width || 'auto',
      height: isModal ? '20vh' : style?.height || 'auto',
      background: 'rgba(37, 38, 43, 0.8)',
      border: '2px dashed #495057',
      borderRadius: '8px',
      transition: 'all 0.2s ease-in-out',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: onClick ? 'pointer' : 'default',
    };

    return (
      <div style={errorStyle} onClick={(e) => onClick?.(e)}>
        <div style={{ textAlign: 'center', color: '#adb5bd' }}>
          <IconPhoto
            size={isModal ? '4rem' : '3rem'}
            stroke={1.5}
            color='#adb5bd'
            style={{ marginBottom: '0.5rem' }}
          />
          <div
            style={{
              fontSize: isModal ? '1rem' : '0.875rem',
              fontWeight: 500,
              marginBottom: '0.25rem',
              color: '#dee2e6',
              maxWidth: isModal ? '400px' : '200px',
              wordWrap: 'break-word',
            }}
          >
            {fileName || alt}
          </div>
          <div
            style={{
              fontSize: isModal ? '0.875rem' : '0.75rem',
              opacity: 0.7,
            }}
          >
            Failed to load
          </div>
        </div>
      </div>
    );
  }

  return (
    <MantineImage
      src={src}
      alt={alt}
      style={style}
      onClick={(e) => onClick?.(e)}
      onError={() => setImageError(true)}
      {...props}
    />
  );
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
  inModal = false,
}: {
  file: DbFile | File;
  show?: boolean;
  password?: string | null;
  code?: boolean;
  allowZoom?: boolean;
  inModal?: boolean;
}) {
  const [overrideType] = useQueryState('otype', parseAsStringLiteral(['video', 'audio', 'image', 'text']));
  const clipboard = useClipboard();

  const disableMediaPreview = useSettingsStore((state) => state.settings.disableMediaPreview);
  const dbFile = 'id' in file;
  const renderIn = renderMode(file.name.split('.').pop() || '');
  const [fileContent, setFileContent] = useState('');
  const [_fullFileContent, setFullFileContent] = useState('');
  const [type, setType] = useState<string>(file.type.split('/')[0]);
  const [isUploading, setIsUploading] = useState(false);

  const _isCodeFile = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const codeExtensions = [
      'js',
      'jsx',
      'ts',
      'tsx',
      'json',
      'json5',
      'html',
      'htm',
      'css',
      'scss',
      'sass',
      'less',
      'py',
      'java',
      'c',
      'cpp',
      'h',
      'hpp',
      'cs',
      'php',
      'rb',
      'go',
      'rs',
      'swift',
      'kt',
      'vue',
      'svelte',
      'xml',
      'yaml',
      'yml',
      'toml',
      'ini',
      'cfg',
      'conf',
      'sh',
      'bash',
      'ps1',
      'bat',
      'cmd',
      'sql',
      'r',
      'scala',
      'clj',
      'elm',
      'dart',
      'lua',
      'pl',
      'pm',
      'hs',
      'ml',
      'fs',
      'ex',
      'exs',
      'erl',
      'hrl',
      'nim',
      'cr',
      'jl',
      'rkt',
      'scm',
      'asm',
      's',
      'makefile',
      'dockerfile',
      'gitignore',
      'gitattributes',
      'editorconfig',
      'prettierrc',
      'eslintrc',
      'babelrc',
      'tsconfig',
      'package',
      'composer',
      'gemfile',
      'rakefile',
      'procfile',
      'cmakelists',
      'gradle',
      'maven',
      'ant',
      'sbt',
      'cabal',
      'tex',
      'md',
      'rst',
      'adoc',
      'org',
      'txt',
      'log',
      'csv',
      'tsv',
    ];
    return codeExtensions.includes(extension) || filename.toLowerCase().includes('config');
  };
  const [open, setOpen] = useState(false);

  const handleImageClick = (e?: React.MouseEvent) => {
    if (e?.shiftKey) {
      e.stopPropagation();
      const fileUrl = dbFile
        ? `${window.location.origin}/raw/${file.name}`
        : URL.createObjectURL(file as File);
      clipboard.copy(fileUrl);
      showNotification({
        title: 'Link Copied',
        message: `File link copied to clipboard: ${file.name}`,
        color: 'green',
      });
      return;
    }

    setOpen(true);
  };

  const uploadToPaste = async () => {
    if (!dbFile) return;

    setIsUploading(true);

    showNotification({
      id: 'paste-uploading',
      title: 'Uploading to Paste',
      message: 'Uploading file content to paste service...',
      loading: true,
      autoClose: false,
    });

    try {
      const response = await fetch('/api/paste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fileId: file.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload to paste service');
      }

      const result = await response.json();

      updateNotification({
        id: 'paste-uploading',
        title: result.alreadyExists ? 'Paste Already Exists' : 'Upload Complete',
        message: `File ${result.alreadyExists ? 'was already pasted' : 'uploaded successfully'}! Click here to open: ${result.pasteUrl}`,
        color: 'green',
        autoClose: 10000,
        onClick: () => window.open(result.pasteUrl, '_blank'),
        style: { cursor: 'pointer' },
        loading: false,
      });
    } catch {
      updateNotification({
        id: 'paste-uploading',
        title: 'Upload Failed',
        message: 'Failed to upload file to paste service. Please try again.',
        color: 'red',
        autoClose: 5000,
        loading: false,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const gettext = async () => {
    if (!dbFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const fullContent = reader.result as string;
        setFullFileContent(fullContent);
        const lines = fullContent.split('\n');
        if (lines.length > 498) {
          setFileContent(
            lines.slice(0, 498).join('\n') +
              '\n...\nShowing first 500 lines. Click "Pastey" to view the full file.',
          );
        } else {
          setFileContent(fullContent);
        }
      };
      reader.readAsText(file);
      return;
    }

    const res = await fetch(`/raw/${file.name}${password ? `?pw=${password}` : ''}`);
    const fullContent = await res.text();
    setFullFileContent(fullContent);
    const lines = fullContent.split('\n');
    if (lines.length > 498) {
      setFileContent(
        lines.slice(0, 498).join('\n') +
          '\n...\nShowing first 500 lines. Click "Pastey" to view the full file.',
      );
    } else {
      setFileContent(fullContent);
    }
  };

  useEffect(() => {
    const shouldTreatAsText = () => {
      if (code || overrideType === 'text') return true;

      if (type === 'text') return true;

      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const codeExtensions = [
        'js',
        'jsx',
        'ts',
        'tsx',
        'json',
        'json5',
        'html',
        'htm',
        'css',
        'scss',
        'sass',
        'less',
        'py',
        'java',
        'c',
        'cpp',
        'h',
        'hpp',
        'cs',
        'php',
        'rb',
        'go',
        'rs',
        'swift',
        'kt',
        'vue',
        'svelte',
        'xml',
        'yaml',
        'yml',
        'toml',
        'ini',
        'cfg',
        'conf',
        'sh',
        'bash',
        'ps1',
        'bat',
        'cmd',
        'sql',
        'r',
        'scala',
        'clj',
        'elm',
        'dart',
        'lua',
        'pl',
        'pm',
        'hs',
        'ml',
        'fs',
        'ex',
        'exs',
        'erl',
        'hrl',
        'nim',
        'cr',
        'jl',
        'rkt',
        'scm',
        'asm',
        's',
        'makefile',
        'dockerfile',
        'gitignore',
        'gitattributes',
        'editorconfig',
        'prettierrc',
        'eslintrc',
        'babelrc',
        'tsconfig',
        'package',
        'composer',
        'gemfile',
        'rakefile',
        'procfile',
        'cmakelists',
        'gradle',
        'maven',
        'ant',
        'sbt',
        'cabal',
        'tex',
        'md',
        'rst',
        'adoc',
        'org',
        'txt',
        'log',
        'csv',
        'tsv',
      ];

      return (
        codeExtensions.includes(extension) ||
        file.name.toLowerCase().includes('config') ||
        file.type.includes('json') ||
        file.type.includes('javascript') ||
        file.type.includes('text')
      );
    };

    if (shouldTreatAsText()) {
      setType('text');
      gettext();
    }
  }, []);

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
    return <Placeholder text={`FIle: ${file.name}`} Icon={fileIcon(file.type)} />;

  if (dbFile && file.password === true && !show)
    return <Placeholder text={`Protected: ${file.name}`} Icon={IconShieldLockFilled} />;

  if (dbFile && file.password === true && show)
    return (
      <Paper withBorder p='xs' style={{ cursor: 'pointer' }}>
        <Placeholder
          text={`Protected: ${file.name}`}
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
          <ImageWithFallback
            src={`/raw/${(file as DbFile).thumbnail!.path}`}
            alt={file.name}
            fileName={file.name}
          />

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
        <Placeholder text={`Video: ${file.name}`} Icon={fileIcon(file.type)} />
      );
    case 'image':
      const isImageTooLarge = file.size > 10 * 1024 * 1024;

      if (isImageTooLarge && !show) {
        return (
          <Center py='xs' style={{ height: '100%', width: '100%', minHeight: '200px' }}>
            <Stack align='center' gap='sm'>
              <IconPhoto
                size='3rem'
                stroke={1.5}
                style={{
                  filter: 'drop-shadow(0 0 10px rgba(0, 0, 0, 0.9))',
                  color: '#ffd43b',
                }}
              />
              <Text size='md' ta='center' c='dimmed'>
                Image Too Large
              </Text>
              <Text size='sm' ta='center' c='dimmed' style={{ opacity: 0.7 }}>
                {(file.size / (1024 * 1024)).toFixed(1)} MB - Click to view
              </Text>
            </Stack>
          </Center>
        );
      }

      return show ? (
        <Center>
          <ImageWithFallback
            src={dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)}
            alt={file.name}
            fileName={file.name}
            isModal={true}
            style={{
              cursor: allowZoom ? 'zoom-in' : 'default',
              maxWidth: '70vw',
              maxHeight: '70vw',
            }}
            onClick={handleImageClick}
          />
          {allowZoom && open && (
            <FileZoomModal setOpen={setOpen}>
              <ImageWithFallback
                src={
                  dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)
                }
                alt={file.name}
                fileName={file.name}
                isModal={true}
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
        <ImageWithFallback
          src={dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)}
          alt={file.name}
          fileName={file.name}
          isModal={false}
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
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
        <Placeholder text={`Audio: ${file.name}`} Icon={fileIcon(file.type)} />
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
          <Render
            mode={renderIn}
            language={file.name.split('.').pop() || ''}
            code={fileContent}
            onUploadToPaste={dbFile ? uploadToPaste : undefined}
            isUploading={isUploading}
            fileName={file.name}
            fileId={dbFile ? file.id : undefined}
            inModal={inModal}
          />
        )
      ) : (
        <Placeholder text={`File: ${file.name}`} Icon={fileIcon(file.type)} />
      );
    default:
      if (dbFile && !show) return <Placeholder text={`File: ${file.name}`} Icon={fileIcon(file.type)} />;

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
