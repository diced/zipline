import { Button, Group, Select, Title } from '@mantine/core';
import { showNotification, updateNotification } from '@mantine/notifications';
import CodeInput from 'components/CodeInput';
import { TypeIcon, UploadIcon } from 'components/icons';
import Link from 'components/Link';
import exts from 'lib/exts';
import { useStoreSelector } from 'lib/redux/store';
import { useState } from 'react';

export default function Upload() {
  const user = useStoreSelector(state => state.user);

  const [value, setValue] = useState('');
  const [lang, setLang] = useState('txt');

  const handleUpload = async () => {
    const file = new File([value], 'text.' + lang);

    showNotification({
      id: 'upload-text',
      title: 'Uploading...',
      message: '',
      loading: true,
      autoClose: false,
    });

    const req = new XMLHttpRequest();
    req.addEventListener('load', e => {
      // @ts-ignore not sure why it thinks response doesnt exist, but it does.
      const json = JSON.parse(e.target.response);

      if (!json.error) {
        updateNotification({
          id: 'upload-text',
          title: 'Upload Successful',
          message: <>Copied first file to clipboard! <br />{json.files.map(x => (<Link key={x} href={x}>{x}<br /></Link>))}</>,
        });
      }
    });

    const body = new FormData();
    body.append('file', file);

    req.open('POST', '/api/upload');
    req.setRequestHeader('Authorization', user.token);
    req.setRequestHeader('UploadText', 'true');

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
          icon={<TypeIcon />}
        />
        <Button leftIcon={<UploadIcon />} onClick={handleUpload} disabled={value.trim().length === 0 ? true : false}>Upload</Button>
      </Group>
    </>
  );
}
