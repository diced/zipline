import { Button, Collapse, Group, Progress, Select, Title } from '@mantine/core';
import { randomId, useClipboard } from '@mantine/hooks';
import { showNotification, updateNotification } from '@mantine/notifications';
import Dropzone from 'components/dropzone/Dropzone';
import FileDropzone from 'components/dropzone/DropzoneFile';
import { ClockIcon, CrossIcon, UploadIcon } from 'components/icons';
import Link from 'components/Link';
import { useStoreSelector } from 'lib/redux/store';
import { useEffect, useState } from 'react';

const expires = [
  '5min',
  '10min',
  '15min',
  '30min',
  '1h',
  '2h',
  '3h',
  '4h',
  '5h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '5d',
  '7d',
  '1w',
  '1.5w',
  '2w',
  '3w',
  '1m',
  '1.5m',
  '2m',
  '3m',
  '6m',
  '8m',
  '1y',
  'never',
];

export default function Upload() {
  const clipboard = useClipboard();
  const user = useStoreSelector(state => state.user);

  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expires, setExpires] = useState('never');

  useEffect(() => {
    window.addEventListener('paste', (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find(x => /^image/.test(x.type));
      const file = item.getAsFile();
      setFiles([...files, file]);
      showNotification({
        title: 'Image imported from clipboard',
        message: '',
      });
    });
  });

  const handleUpload = async () => {
    const expires_at = expires === 'never' ? null : new Date({
      '5min': Date.now() + 5 * 60 * 1000,
      '10min': Date.now() + 10 * 60 * 1000,
      '15min': Date.now() + 15 * 60 * 1000,
      '30min': Date.now() + 30 * 60 * 1000,
      '1h': Date.now() + 60 * 60 * 1000,
      '2h': Date.now() + 2 * 60 * 60 * 1000,
      '3h': Date.now() + 3 * 60 * 60 * 1000,
      '4h': Date.now() + 4 * 60 * 60 * 1000,
      '5h': Date.now() + 5 * 60 * 60 * 1000,
      '6h': Date.now() + 6 * 60 * 60 * 1000,
      '8h': Date.now() + 8 * 60 * 60 * 1000,
      '12h': Date.now() + 12 * 60 * 60 * 1000,
      '1d': Date.now() + 24 * 60 * 60 * 1000,
      '3d': Date.now() + 3 * 24 * 60 * 60 * 1000,
      '5d': Date.now() + 5 * 24 * 60 * 60 * 1000,
      '7d': Date.now() + 7 * 24 * 60 * 60 * 1000,
      '1w': Date.now() + 7 * 24 * 60 * 60 * 1000,
      '1.5w': Date.now() + 1.5 * 7 * 24 * 60 * 60 * 1000,
      '2w': Date.now() + 2 * 7 * 24 * 60 * 60 * 1000,
      '3w': Date.now() + 3 * 7 * 24 * 60 * 60 * 1000,
      '1m': Date.now() + 30 * 24 * 60 * 60 * 1000,
      '1.5m': Date.now() + 1.5 * 30 * 24 * 60 * 60 * 1000,
      '2m': Date.now() + 2 * 30 * 24 * 60 * 60 * 1000,
      '3m': Date.now() + 3 * 30 * 24 * 60 * 60 * 1000,
      '6m': Date.now() + 6 * 30 * 24 * 60 * 60 * 1000,
      '8m': Date.now() + 8 * 30 * 24 * 60 * 60 * 1000,
      '1y': Date.now() + 365 * 24 * 60 * 60 * 1000,
    }[expires]);

    setProgress(0);
    setLoading(true);
    const body = new FormData();
    for (let i = 0; i !== files.length; ++i) body.append('file', files[i]);

    showNotification({
      id: 'upload',
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
        updateNotification({
          id: 'upload',
          title: 'Upload Successful',
          message: <>Copied first image to clipboard! <br />{json.files.map(x => (<Link key={x} href={x}>{x}<br /></Link>))}</>,
          color: 'green',
          icon: <UploadIcon />,
        });
        clipboard.copy(json.files[0]);
        setFiles([]);
      } else {
        updateNotification({
          id: 'upload',
          title: 'Upload Failed',
          message: json.error,
          color: 'red',
          icon: <CrossIcon />,
        });
      }
      setProgress(0);
    }, false);

    req.open('POST', '/api/upload');
    req.setRequestHeader('Authorization', user.token);
    expires !== 'never' && req.setRequestHeader('Expires-At', expires_at.toISOString());

    req.send(body);
  };

  return (
    <>
      <Title mb='md'>Upload Files</Title>

      <Dropzone loading={loading} onDrop={(f) => setFiles([...files, ...f])}>
        <Group position='center' spacing='md'>
          {files.map(file => (<FileDropzone  key={randomId()} file={file} />))}
        </Group>
      </Dropzone>

      <Collapse in={progress !== 0}>
        {progress !== 0 && <Progress mt='md' value={progress} animate />}
      </Collapse>

      <Group position='right' mt='md'>
        <Select
          value={expires}
          onChange={(e) => setExpires(e)}
          icon={<ClockIcon size={14} />}
          data={[
            { value: 'never', label: 'Never' },
            { value: '5min', label: '5 minutes' },
            { value: '10min', label: '10 minutes' },
            { value: '15min', label: '15 minutes' },
            { value: '30min', label: '30 minutes' },
            { value: '1h', label: '1 hour' },
            { value: '2h', label: '2 hours' },
            { value: '3h', label: '3 hours' },
            { value: '4h', label: '4 hours' },
            { value: '5h', label: '5 hours' },
            { value: '6h', label: '6 hours' },
            { value: '8h', label: '8 hours' },
            { value: '12h', label: '12 hours' },
            { value: '1d', label: '1 day' },
            { value: '3d', label: '3 days' },
            { value: '5d', label: '5 days' },
            { value: '7d', label: '7 days' },
            { value: '1w', label: '1 week' },
            { value: '1.5w', label: '1.5 weeks' },
            { value: '2w', label: '2 weeks' },
            { value: '3w', label: '3 weeks' },
            { value: '1m', label: '1 month' },
            { value: '1.5m', label: '1.5 months' },
            { value: '2m', label: '2 months' },
            { value: '3m', label: '3 months' },
            { value: '6m', label: '6 months' },
            { value: '8m', label: '8 months' },
            { value: '1y', label: '1 year' },
          ]}
        />
        <Button leftIcon={<UploadIcon />} onClick={handleUpload} disabled={files.length === 0 ? true : false}>Upload</Button>
      </Group>
    </>
  );
}
