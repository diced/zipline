import { Button, Group, Select, Tabs, Title } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { Language } from 'prism-react-renderer';
import { showNotification, updateNotification } from '@mantine/notifications';
import CodeInput from 'components/CodeInput';
import { ImageIcon, TypeIcon, UploadIcon } from 'components/icons';
import Link from 'components/Link';
import exts from 'lib/exts';
import { userSelector } from 'lib/recoil/user';
import { useState } from 'react';
import { useRecoilValue } from 'recoil';

export default function Upload() {
  const user = useRecoilValue(userSelector);

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
    req.addEventListener('load', (e) => {
      // @ts-ignore not sure why it thinks response doesnt exist, but it does.
      const json = JSON.parse(e.target.response);

      if (!json.error) {
        updateNotification({
          id: 'upload-text',
          title: 'Upload Successful',
          message: (
            <>
              Copied first file to clipboard! <br />
              {json.files.map((x) => (
                <Link key={x} href={x}>
                  {x}
                  <br />
                </Link>
              ))}
            </>
          ),
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

      <Tabs defaultValue='text' variant='pills'>
        <Tabs.List>
          <Tabs.Tab value='text' icon={<TypeIcon />}>
            Text
          </Tabs.Tab>
          <Tabs.Tab value='preview' icon={<ImageIcon />}>
            Preview
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel mt='sm' value='text'>
          <CodeInput value={value} onChange={(e) => setValue(e.target.value)} />
        </Tabs.Panel>

        <Tabs.Panel mt='sm' value='preview'>
          <Prism
            sx={(t) => ({ height: '80vh', backgroundColor: t.colors.dark[8] })}
            withLineNumbers
            language={lang as Language}
          >
            {value}
          </Prism>
        </Tabs.Panel>
      </Tabs>

      <Group position='right' mt='md'>
        <Select
          value={lang}
          onChange={setLang}
          dropdownPosition='top'
          data={Object.keys(exts).map((x) => ({ value: x, label: exts[x] }))}
          icon={<TypeIcon />}
          searchable
        />
        <Button
          leftIcon={<UploadIcon />}
          onClick={handleUpload}
          disabled={value.trim().length === 0 ? true : false}
        >
          Upload
        </Button>
      </Group>
    </>
  );
}
