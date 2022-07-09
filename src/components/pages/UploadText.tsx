import { Button, Collapse, Group, Progress, Select, Title, useMantineTheme } from '@mantine/core';
import { randomId, useClipboard } from '@mantine/hooks';
import { useNotifications } from '@mantine/notifications';
import { CrossCircledIcon, LetterCaseCapitalizeIcon, LetterCaseLowercaseIcon, UploadIcon } from '@modulz/radix-icons';
import CodeInput from 'components/CodeInput';
import Dropzone from 'components/dropzone/Dropzone';
import FileDropzone from 'components/dropzone/DropzoneFile';
import Link from 'components/Link';
import exts from 'lib/exts';
import { useStoreSelector } from 'lib/redux/store';
import { useEffect, useState } from 'react';

export default function Upload() {
  const notif = useNotifications();
  const clipboard = useClipboard();
  const user = useStoreSelector(state => state.user);


  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');
  const [lang, setLang] = useState('txt');
  console.log(lang);
  
  const handleUpload = async () => {
    setProgress(0);
    setLoading(true);

    const file = new File([value], 'text.' + lang);

    const id = notif.showNotification({
      title: 'Uploading...',
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

      if (!json.error) {
        notif.updateNotification(id, {
          title: 'Upload Successful',
          message: <>Copied first file to clipboard! <br />{json.files.map(x => (<Link key={x} href={x}>{x}<br /></Link>))}</>,
        });
      }
    });

    const body = new FormData();
    body.append('file', file);

    req.open('POST', '/api/upload');
    req.setRequestHeader('Authorization', user.token);
    req.send(body);
  };
  
  return (
    <>
      <Title mb='md'>Upload Text</Title>

      <CodeInput
        value={value}
        onChange={e => setValue(e.target.value)}
      />

      <Group position='right' mt='md'>
        <Select
          value={lang}
          onChange={setLang}
          dropdownPosition='top'
          data={Object.keys(exts).map(x => ({ value: x, label: exts[x] }))}
          icon={<LetterCaseCapitalizeIcon />}
        />
        <Button leftIcon={<UploadIcon />} onClick={handleUpload}>Upload</Button>
      </Group>
    </>
  );
}
