import React, { useEffect, useState } from 'react';

import { useStoreSelector } from 'lib/redux/store';
import Link from 'components/Link';
import { Button, Group, Text, useMantineTheme } from '@mantine/core';
import { ImageIcon, UploadIcon, CrossCircledIcon } from '@modulz/radix-icons';
import { Dropzone } from '@mantine/dropzone';
import { useNotifications } from '@mantine/notifications';
import { useClipboard } from '@mantine/hooks';

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

export default function Upload() {
  const theme = useMantineTheme();
  const notif = useNotifications();
  const clipboard = useClipboard();
  const user = useStoreSelector(state => state.user);

  const [files, setFiles] = useState([]);

  useEffect(() => {
    window.addEventListener('paste', (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find(x => /^image/.test(x.type));
      const blob = item.getAsFile();
      setFiles([...files, new File([blob], blob.name, { type: blob.type })]);
      notif.showNotification({
        title: 'Image Imported',
        message: '',
      });
    });
  });
  
  const handleUpload = async () => {
    const body = new FormData();
    for (let i = 0; i !== files.length; ++i) body.append('file', files[i]);

    const id = notif.showNotification({
      title: 'Uploading Images...',
      message: '',
      loading: true,
    });

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': user.token,
      },
      body,
    });
    const json = await res.json();
    if (res.ok && json.error === undefined) {
      notif.updateNotification(id, {
        title: 'Upload Successful',
        message: <>Copied first image to clipboard! <br/>{json.files.map(x => (<Link key={x} href={x}>{x}<br/></Link>))}</>,
        color: 'green',
        icon: <UploadIcon />,
      });
      clipboard.copy(json.url);
      setFiles([]);
    } else {
      notif.updateNotification(id, {
        title: 'Upload Failed',
        message: json.error,
        color: 'red',
        icon: <CrossCircledIcon />,
      });
    }
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
            <Group position='center' spacing='xl' style={{ pointerEvents: 'none' }}>
              {files.map(file => (<Text key={file.name} weight='bold'>{file.name}</Text>))}
            </Group>
          </>
        )}
      </Dropzone>
      <Group position='right'>
        <Button leftIcon={<UploadIcon />} mt={12} onClick={handleUpload}>Upload</Button>
      </Group>
    </>
  );
}
