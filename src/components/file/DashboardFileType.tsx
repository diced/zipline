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
import { showNotification, updateNotification } from '@mantine/notifications';
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

  const disableMediaPreview = useSettingsStore((state) => state.settings.disableMediaPreview);
  const dbFile = 'id' in file;
  const renderIn = renderMode(file.name.split('.').pop() || '');
  const [fileContent, setFileContent] = useState('');
  const [_fullFileContent, setFullFileContent] = useState('');
  const [type, setType] = useState<string>(file.type.split('/')[0]);
  const [isUploading, setIsUploading] = useState(false);

  // Check if file should be treated as text/code based on extension
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

  const uploadToPaste = async () => {
    if (!dbFile) return; // Only works for database files now

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

      // Update the existing notification
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
      // Update the existing notification with error
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
    // Check if file should be treated as code/text based on extension or MIME type
    const shouldTreatAsText = () => {
      // First check if it's explicitly marked as code or text type
      if (code || overrideType === 'text') return true;

      // Check MIME type
      if (type === 'text') return true;

      // Check for common code file extensions
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
        <Placeholder text={`Video: ${file.name}`} Icon={fileIcon(file.type)} />
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
          src={dbFile ? `/raw/${file.name}${password ? `?pw=${password}` : ''}` : URL.createObjectURL(file)}
          alt={file.name}
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
