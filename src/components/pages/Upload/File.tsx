import { Button, Collapse, Group, Progress, Stack, Title } from '@mantine/core';
import { randomId, useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { hideNotification, showNotification, updateNotification } from '@mantine/notifications';
import {
  IconClipboardCopy,
  IconFileImport,
  IconFileTime,
  IconFileUpload,
  IconFileX,
} from '@tabler/icons-react';
import Dropzone from 'components/dropzone/Dropzone';
import FileDropzone from 'components/dropzone/DropzoneFile';
import MutedText from 'components/MutedText';
import { invalidateFiles } from 'lib/queries/files';
import { userSelector } from 'lib/recoil/user';
import { expireReadToDate, randomChars } from 'lib/utils/client';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import showFilesModal from './showFilesModal';
import useUploadOptions from './useUploadOptions';
import { useRouter } from 'next/router';
import AnchorNext from 'components/AnchorNext';

export default function File({ chunks: chunks_config }) {
  const router = useRouter();

  const clipboard = useClipboard();
  const modals = useModals();
  const user = useRecoilValue(userSelector);

  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const [options, setOpened, OptionsModal] = useUploadOptions();

  const beforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to leave? Your upload(s) won't be saved.";
        return e.returnValue;
      }
    },
    [loading]
  );

  const beforeRouteChange = useCallback(
    (url: string) => {
      if (loading) {
        const confirmed = confirm("Are you sure you want to leave? Your upload(s) won't be saved.");
        if (!confirmed) {
          router.events.emit('routeChangeComplete', url);
          throw 'Route change aborted';
        }
      }
    },
    [loading]
  );

  useEffect(() => {
    const listener = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find((x) => /^image/.test(x.type));
      if (!item) return;

      const file = item.getAsFile();

      setFiles([...files, file]);
      showNotification({
        title: 'Image imported from clipboard',
        message: '',
        icon: <IconFileImport size='1rem' />,
      });
    };

    document.addEventListener('paste', listener);
    window.addEventListener('beforeunload', beforeUnload, true);
    router.events.on('routeChangeStart', beforeRouteChange);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload, true);
      router.events.off('routeChangeStart', beforeRouteChange);
      document.removeEventListener('paste', listener);
    };
  }, [loading, beforeUnload, beforeRouteChange]);

  const handleChunkedFiles = async (expiresAt: Date, toChunkFiles: File[]) => {
    for (let i = 0; i !== toChunkFiles.length; ++i) {
      const file = toChunkFiles[i];
      const identifier = randomChars(4);

      const nChunks = Math.ceil(file.size / chunks_config.chunks_size);
      const chunks: {
        blob: Blob;
        start: number;
        end: number;
      }[] = [];

      for (let j = 0; j !== nChunks; ++j) {
        const chunk = file.slice(j * chunks_config.chunks_size, (j + 1) * chunks_config.chunks_size);
        chunks.push({
          blob: chunk,
          start: j * chunks_config.chunks_size,
          end: (j + 1) * chunks_config.chunks_size,
        });
      }

      let ready = true;
      for (let j = 0; j !== chunks.length; ++j) {
        while (!ready) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const body = new FormData();
        body.append('file', chunks[j].blob);

        setLoading(true);
        const req = new XMLHttpRequest();

        req.addEventListener(
          'load',
          (e) => {
            // @ts-ignore not sure why it thinks response doesnt exist, but it does.
            const json = JSON.parse(e.target.response);

            if (json.error === undefined) {
              setProgress(Math.round((j / chunks.length) * 100));
              updateNotification({
                id: 'upload-chunked',
                title: `Uploading chunk ${j + 1}/${chunks.length} Successful`,
                message: '',
                color: 'green',
                icon: <IconFileUpload size='1rem' />,
                autoClose: false,
              });

              if (j === chunks.length - 1) {
                updateNotification({
                  id: 'upload-chunked',
                  title: 'Finalizing partial upload',
                  message:
                    "The upload has been offloaded, and will complete in the background. Click here to copy the normal URL while it's being processed.",
                  icon: <IconFileTime size='1rem' />,
                  color: 'green',
                  autoClose: false,
                  onClick: () => {
                    hideNotification('upload-chunked');
                    clipboard.copy(json.files[0]);
                    showNotification({
                      title: 'Copied to clipboard',
                      message: <AnchorNext href={json.files[0]}>{json.files[0]}</AnchorNext>,
                      icon: <IconClipboardCopy size='1rem' />,
                    });
                  },
                });
                invalidateFiles();
                setFiles([]);
                setProgress(100);
                setLoading(false);

                setTimeout(() => setProgress(0), 1000);
              }

              ready = true;
            } else {
              updateNotification({
                id: 'upload-chunked',
                title: `Uploading chunk ${j + 1}/${chunks.length} Failed`,
                message: json.error,
                color: 'red',
                icon: <IconFileX size='1rem' />,
                autoClose: false,
              });
              ready = false;
            }
          },
          false
        );

        req.open('POST', '/api/upload');
        req.setRequestHeader('Authorization', user.token);
        req.setRequestHeader('Content-Range', `bytes ${chunks[j].start}-${chunks[j].end}/${file.size}`);
        req.setRequestHeader('X-Zipline-Partial-FileName', file.name);
        req.setRequestHeader('X-Zipline-Partial-MimeType', file.type);
        req.setRequestHeader('X-Zipline-Partial-Identifier', identifier);
        req.setRequestHeader('X-Zipline-Partial-LastChunk', j === chunks.length - 1 ? 'true' : 'false');
        options.expires !== 'never' && req.setRequestHeader('Expires-At', 'date=' + expiresAt.toISOString());
        options.password.trim() !== '' && req.setRequestHeader('Password', options.password);
        options.maxViews &&
          options.maxViews !== 0 &&
          req.setRequestHeader('Max-Views', String(options.maxViews));
        options.compression !== 'none' &&
          req.setRequestHeader('Image-Compression-Percent', options.compression);
        options.embedded && req.setRequestHeader('Embed', 'true');
        options.zeroWidth && req.setRequestHeader('Zws', 'true');
        options.format !== 'default' && req.setRequestHeader('Format', options.format);
        options.originalName && req.setRequestHeader('Original-Name', 'true');

        req.send(body);

        ready = false;
      }
    }
  };

  const handleUpload = async () => {
    const expiresAt = options.expires === 'never' ? null : expireReadToDate(options.expires);

    setProgress(0);
    setLoading(true);
    const body = new FormData();
    const toChunkFiles = [];

    for (let i = 0; i !== files.length; ++i) {
      const file = files[i];
      if (file.size >= chunks_config.max_size) {
        toChunkFiles.push(file);
      } else {
        body.append('file', files[i]);
      }
    }

    const bodyLength = body.getAll('file').length;

    if (bodyLength === 0 && toChunkFiles.length) {
      showNotification({
        id: 'upload-chunked',
        title: 'Uploading chunked files',
        message: '',
        loading: true,
        autoClose: false,
      });

      return handleChunkedFiles(expiresAt, toChunkFiles);
    }

    showNotification({
      id: 'upload',
      title: 'Uploading files...',
      message: '',
      loading: true,
      autoClose: false,
    });

    const req = new XMLHttpRequest();
    req.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    req.addEventListener(
      'load',
      (e) => {
        // @ts-ignore not sure why it thinks response doesnt exist, but it does.
        const json = JSON.parse(e.target.response);
        setLoading(false);

        if (!json.error) {
          updateNotification({
            id: 'upload',
            title: 'Upload Successful',
            message: '',
            color: 'green',
            icon: <IconFileUpload size='1rem' />,
          });
          showFilesModal(clipboard, modals, json.files);
          setFiles([]);
          invalidateFiles();

          if (toChunkFiles.length) {
            showNotification({
              id: 'upload-chunked',
              title: 'Uploading chunked files',
              message: '',
              loading: true,
              autoClose: false,
            });

            return handleChunkedFiles(expiresAt, toChunkFiles);
          }
        } else {
          updateNotification({
            id: 'upload',
            title: 'Upload Failed',
            message: json.error,
            color: 'red',
            icon: <IconFileX size='1rem' />,
          });
        }
        setProgress(0);
      },
      false
    );

    if (bodyLength !== 0) {
      req.open('POST', '/api/upload');
      req.setRequestHeader('Authorization', user.token);
      options.expires !== 'never' && req.setRequestHeader('Expires-At', 'date=' + expiresAt.toISOString());
      options.password.trim() !== '' && req.setRequestHeader('Password', options.password);
      options.maxViews &&
        options.maxViews !== 0 &&
        req.setRequestHeader('Max-Views', String(options.maxViews));
      options.compression !== 'none' &&
        req.setRequestHeader('Image-Compression-Percent', options.compression);
      options.embedded && req.setRequestHeader('Embed', 'true');
      options.zeroWidth && req.setRequestHeader('Zws', 'true');
      options.format !== 'default' && req.setRequestHeader('Format', options.format);
      options.originalName && req.setRequestHeader('Original-Name', 'true');
      options.overrideDomain && req.setRequestHeader('Override-Domain', options.overrideDomain);

      req.send(body);
    }
  };

  return (
    <>
      {OptionsModal}
      <Title mb='md'>Upload Files</Title>

      <Dropzone loading={loading} onDrop={(f) => setFiles([...files, ...f])}>
        <Stack justify='space-between' h='100%'>
          {files.length ? (
            <Group spacing='md'>
              {files.map((file) => (
                <FileDropzone
                  key={randomId()}
                  file={file}
                  onRemove={() => setFiles(files.filter((f) => f !== file))}
                />
              ))}
            </Group>
          ) : (
            <Group position='center'>
              <MutedText>Files will appear here once you drop/select them</MutedText>
            </Group>
          )}

          <Stack>
            <Group position='right' mt='md'>
              <Button onClick={() => setOpened(true)} variant='outline'>
                Options
              </Button>
              <Button onClick={() => setFiles([])} color='red' variant='outline'>
                Clear Files
              </Button>
              <Button
                leftIcon={<IconFileUpload size='1rem' />}
                onClick={handleUpload}
                disabled={files.length === 0 ? true : false}
              >
                Upload
              </Button>
            </Group>

            <Collapse in={progress !== 0}>
              {progress !== 0 && <Progress mt='md' value={progress} animate />}
            </Collapse>
          </Stack>
        </Stack>
      </Dropzone>
    </>
  );
}
