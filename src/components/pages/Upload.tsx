import { Button, Collapse, Group, Progress, Title, useMantineTheme } from '@mantine/core';
import { randomId, useClipboard } from '@mantine/hooks';
import { useNotifications } from '@mantine/notifications';
import { CrossCircledIcon, UploadIcon } from '@modulz/radix-icons';
import Dropzone from 'components/dropzone/Dropzone';
import FileDropzone from 'components/dropzone/DropzoneFile';
import Link from 'components/Link';
import { useStoreSelector } from 'lib/redux/store';
import { useEffect, useState } from 'react';

export default function Upload() {
  const notif = useNotifications();
  const clipboard = useClipboard();
  const user = useStoreSelector(state => state.user);

  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
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
      setLoading(false);

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
      setProgress(0);
    }, false);

    req.open('POST', '/api/upload');
    req.setRequestHeader('Authorization', user.token);
    req.send(body);
  };

  return (
    <>
      <Title mb='md'>Upload Files</Title>
      
      <Dropzone loading={loading} onDrop={(f) => setFiles([...files, ...f])}>
        <Group position='center' spacing='md'>
          {files.map(file => (<FileDropzone key={randomId()} file={file} />))}
        </Group>
      </Dropzone>

      <Collapse in={progress !== 0}>
        {progress !== 0 && <Progress mt='md' value={progress} animate />}
      </Collapse>

      <Group position='right'>
        <Button leftIcon={<UploadIcon />} mt={12} onClick={handleUpload}>Upload</Button>
      </Group>
    </>
  );
}
