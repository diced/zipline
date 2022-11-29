import { Button, Group, NumberInput, PasswordInput, Select, Tabs, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification, updateNotification } from '@mantine/notifications';
import { Prism } from '@mantine/prism';
import CodeInput from 'components/CodeInput';
import { ClockIcon, ImageIcon, TypeIcon, UploadIcon } from 'components/icons';
import exts from 'lib/exts';
import { userSelector } from 'lib/recoil/user';
import { expireReadToDate } from 'lib/utils/client';
import { Language } from 'prism-react-renderer';
import { useState } from 'react';
import { useRecoilValue } from 'recoil';
import showFilesModal from './showFilesModal';
import useUploadOptions from './useUploadOptions';

export default function Text() {
  const clipboard = useClipboard();
  const modals = useModals();
  const user = useRecoilValue(userSelector);

  const [value, setValue] = useState('');
  const [lang, setLang] = useState('txt');

  const [options, setOpened, OptionsModal] = useUploadOptions();

  const handleUpload = async () => {
    const file = new File([value], 'text.' + lang);

    const expires_at = options.expires === 'never' ? null : expireReadToDate(options.expires);

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
          message: '',
        });
        showFilesModal(clipboard, modals, json.files);
      }
    });

    const body = new FormData();
    body.append('file', file);

    req.open('POST', '/api/upload');
    req.setRequestHeader('Authorization', user.token);
    req.setRequestHeader('UploadText', 'true');

    options.expires !== 'never' && req.setRequestHeader('Expires-At', 'date=' + expires_at.toISOString());
    options.password.trim() !== '' && req.setRequestHeader('Password', options.password);
    options.maxViews && options.maxViews !== 0 && req.setRequestHeader('Max-Views', String(options.maxViews));
    options.compression !== 'none' && req.setRequestHeader('Image-Compression-Percent', options.compression);
    options.embedded && req.setRequestHeader('Embed', 'true');
    options.zeroWidth && req.setRequestHeader('Zws', 'true');
    options.format !== 'default' && req.setRequestHeader('Format', options.format);

    req.send(body);
  };

  return (
    <>
      <OptionsModal />
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

        <Button onClick={() => setOpened(true)} variant='outline'>
          Options
        </Button>

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
