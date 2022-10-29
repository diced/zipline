import { Button, Group, NumberInput, PasswordInput, Select, Tabs, Title, Tooltip } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { Language } from 'prism-react-renderer';
import { showNotification, updateNotification } from '@mantine/notifications';
import CodeInput from 'components/CodeInput';
import { ClockIcon, ImageIcon, TypeIcon, UploadIcon } from 'components/icons';
import Link from 'components/Link';
import exts from 'lib/exts';
import { userSelector } from 'lib/recoil/user';
import { useState } from 'react';
import { useRecoilValue } from 'recoil';

export default function Upload() {
  const user = useRecoilValue(userSelector);

  const [value, setValue] = useState('');
  const [lang, setLang] = useState('txt');
  const [password, setPassword] = useState('');
  const [expires, setExpires] = useState('never');
  const [maxViews, setMaxViews] = useState<number>(undefined);

  const handleUpload = async () => {
    const file = new File([value], 'text.' + lang);

    const expires_at =
      expires === 'never'
        ? null
        : new Date(
            {
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
            }[expires]
          );

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

    expires !== 'never' && req.setRequestHeader('Expires-At', 'date=' + expires_at.toISOString());
    password !== '' && req.setRequestHeader('Password', password);
    maxViews && maxViews !== 0 && req.setRequestHeader('Max-Views', String(maxViews));

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
        <Tooltip label='After the file reaches this amount of views, it will be deleted automatically. Leave blank for no limit.'>
          <NumberInput placeholder='Max Views' min={0} value={maxViews} onChange={(x) => setMaxViews(x)} />
        </Tooltip>
        <Tooltip label='Add a password to your files (optional, leave blank for none)'>
          <PasswordInput
            style={{ width: '252px' }}
            placeholder='Password'
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
        </Tooltip>
        <Tooltip label='Set an expiration date for your files (optional, defaults to never)'>
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
        </Tooltip>
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
