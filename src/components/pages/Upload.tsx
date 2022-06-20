import React, { useEffect, useState } from 'react';

import { useStoreSelector } from 'lib/redux/store';
import Link from 'components/Link';
import { Image, Button, Group, Popover, Progress, Text, useMantineTheme, Tooltip, Stack, Table } from '@mantine/core';
import { ImageIcon, UploadIcon, CrossCircledIcon } from '@modulz/radix-icons';
import { Dropzone } from '@mantine/dropzone';
import { useNotifications } from '@mantine/notifications';
import { randomId, useClipboard } from '@mantine/hooks';

function ImageUploadIcon({ status, ...props }) {
  if (status.accepted) {
    return <UploadIcon {...props} />;
  }

  if (status.rejected) {
    return <CrossCircledIcon {...props} />;
  }

  return <ImageIcon {...props} />;
}

function getIconColor(status, theme) {
  return status.accepted
    ? theme.colors[theme.primaryColor][6]
    : status.rejected
      ? theme.colors.red[6]
      : theme.colorScheme === 'dark'
        ? theme.colors.dark[0]
        : theme.black;
}

function ImageDropzone({ file }: { file: File }) {
  const theme = useMantineTheme();

  return (
    <Tooltip
      position='top'
      placement='center'
      color={theme.colorScheme === 'dark' ? 'dark' : undefined}
      styles={{
        body: {
          color: 'white',
        },
      }}
      label={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Image src={URL.createObjectURL(file)} alt={file.name} sx={{ maxWidth: '10vw', maxHeight: '100vh' }} mr='md' />
          <Table>
            <tbody>
              <tr>
                <td>Name</td>
                <td>{file.name}</td>
              </tr>
              <tr>
                <td>Type</td>
                <td>{file.type}</td>
              </tr>
              <tr>
                <td>Last Modified</td>
                <td>{new Date(file.lastModified).toLocaleString()}</td>
              </tr>
            </tbody>
          </Table>
        </div>
      }
    >
      <Text weight='bold'>{file.name}</Text>
    </Tooltip>
  );
}

export default function Upload() {
  const theme = useMantineTheme();
  const notif = useNotifications();
  const clipboard = useClipboard();
  const user = useStoreSelector(state => state.user);

  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    window.addEventListener('paste', (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find(x => /^image/.test(x.type));
      const blob = item.getAsFile();
      setFiles([...files, new File([blob], blob.name, { type: blob.type })]);
      notif.showNotification({
        title: 'Image imported from clipboard',
        message: '',
      });
    });
  });

  const handleUpload = async () => {
    setProgress(0);
    const body = new FormData();
    for (let i = 0; i !== files.length; ++i) body.append('file', files[i]);

    const id = notif.showNotification({
      title: 'Uploading Images...',
      message: '',
      loading: true,
      autoClose: false,
    });

    const req = new XMLHttpRequest();
    req.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        setProgress(Math.round(e.loaded / e.total * 100));
      }
    });

    req.addEventListener('load', e => {
      // @ts-ignore not sure why it thinks response doesnt exist, but it does.
      const json = JSON.parse(e.target.response);

      if (json.error === undefined) {
        notif.updateNotification(id, {
          title: 'Upload Successful',
          message: <>Copied first image to clipboard! <br />{json.files.map(x => (<Link key={x} href={x}>{x}<br /></Link>))}</>,
          color: 'green',
          icon: <UploadIcon />,
        });
        clipboard.copy(json.files[0]);
        setFiles([]);
      } else {
        notif.updateNotification(id, {
          title: 'Upload Failed',
          message: json.error,
          color: 'red',
          icon: <CrossCircledIcon />,
        });
      }
    }, false);

    req.open('POST', '/api/upload');
    req.setRequestHeader('Authorization', user.token);
    req.send(body);
  };

  return (
    <>
      <Dropzone onDrop={(f) => setFiles([...files, ...f])}>
        {status => (
          <>
            <Group position='center' spacing='xl' style={{ minHeight: 220, pointerEvents: 'none' }}>
              <ImageUploadIcon
                status={status}
                style={{ width: 80, height: 80, color: getIconColor(status, theme) }}
              />

              <div>
                <Text size='xl' inline>
                  Drag images here or click to select files
                </Text>
              </div>
            </Group>
            
            
          </>
        )}
      </Dropzone>

      <Group position='center' spacing='xl' mt={12}>
        {files.map(file => (<ImageDropzone key={randomId()} file={file} />))}
      </Group>

      {progress !== 0 && <Progress sx={{ marginTop: 12 }} value={progress} />}

      <Group position='right'>
        <Button leftIcon={<UploadIcon />} mt={12} onClick={handleUpload}>Upload</Button>
      </Group>
    </>
  );
}
