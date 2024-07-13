import { Alert, Button, Card, Container, Group, Select, Tabs, Title } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification, updateNotification } from '@mantine/notifications';
import { IconCursorText, IconFileInfinity, IconFileUpload, IconPhoto } from '@tabler/icons-react';
import CodeInput from 'components/CodeInput';
import KaTeX from 'components/render/KaTeX';
import Markdown from 'components/render/Markdown';
import PrismCode from 'components/render/PrismCode';
import exts from 'lib/exts';
import { userSelector } from 'lib/recoil/user';
import { expireReadToDate } from 'lib/utils/client';
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
  const [loading, setLoading] = useState(false);

  const [options, setOpened, OptionsModal] = useUploadOptions();

  const shouldRenderMarkdown = lang === 'md';
  const shouldRenderTex = lang === 'tex';

  const handleUpload = async () => {
    if (value.trim().length === 0) return;

    setLoading(true);
    const file = new File([value], 'text.' + lang);

    const expiresAt = options.expires === 'never' ? null : expireReadToDate(options.expires);

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
        setLoading(false);
        setValue('');
      } else {
        updateNotification({
          id: 'upload-text',
          title: 'Upload Failed',
          message: json.error,
          color: 'red',
        });
        setLoading(false);
      }
    });

    const body = new FormData();
    body.append('file', file);

    req.open('POST', '/api/upload');
    req.setRequestHeader('Authorization', user.token);
    req.setRequestHeader('UploadText', 'true');

    options.expires !== 'never' && req.setRequestHeader('Expires-At', 'date=' + expiresAt.toISOString());
    options.password.trim() !== '' && req.setRequestHeader('Password', options.password);
    options.maxViews && options.maxViews !== 0 && req.setRequestHeader('Max-Views', String(options.maxViews));
    options.compression !== 'none' && req.setRequestHeader('Image-Compression-Percent', options.compression);
    options.embedded && req.setRequestHeader('Embed', 'true');
    options.zeroWidth && req.setRequestHeader('Zws', 'true');
    options.format !== 'default' && req.setRequestHeader('Format', options.format);
    options.originalName && req.setRequestHeader('Original-Name', 'true');
    options.overrideDomain && req.setRequestHeader('Override-Domain', options.overrideDomain);

    req.send(body);
  };

  return (
    <>
      {OptionsModal}
      <Title mb='md'>Upload Text</Title>

      <Tabs defaultValue='text' variant='pills'>
        <Tabs.List>
          <Tabs.Tab value='text' icon={<IconCursorText size='1rem' />}>
            Text
          </Tabs.Tab>
          <Tabs.Tab value='preview' icon={<IconPhoto size='1rem' />}>
            Preview
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel mt='sm' value='text'>
          <CodeInput value={value} onChange={(e) => setValue(e.target.value)} />
        </Tabs.Panel>

        <Tabs.Panel mt='sm' value='preview'>
          {shouldRenderMarkdown || shouldRenderTex ? (
            <>
              <Alert color='blue' variant='outline' sx={{ width: '100%' }}>
                You are viewing a rendered version of your code
              </Alert>

              <Container>
                <Card p='md' my='sm'>
                  {shouldRenderMarkdown && <Markdown code={value} />}
                  {shouldRenderTex && <KaTeX code={value} />}
                </Card>
              </Container>
            </>
          ) : (
            <PrismCode
              sx={(t) => ({ height: '100vh', backgroundColor: t.colors.dark[8] })}
              code={value}
              ext={lang}
            />
          )}
        </Tabs.Panel>
      </Tabs>

      <Group position='right' mt='md'>
        <Select
          value={lang}
          onChange={setLang}
          dropdownPosition='top'
          data={Object.keys(exts).map((x) => ({ value: x, label: exts[x] }))}
          icon={<IconFileInfinity size='1rem' />}
          searchable
        />

        <Button onClick={() => setOpened(true)} variant='outline'>
          Options
        </Button>

        <Button
          leftIcon={<IconFileUpload size='1rem' />}
          onClick={handleUpload}
          disabled={value.trim().length === 0 || loading}
          loading={loading}
        >
          Upload
        </Button>
      </Group>
    </>
  );
}
