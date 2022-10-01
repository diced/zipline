import { Box, Button, Card, ColorInput, FileInput, Group, Image, PasswordInput, Space, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { randomId, useInterval } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { showNotification, updateNotification } from '@mantine/notifications';
import { CrossIcon, DeleteIcon, FlameshotIcon, SettingsIcon, ShareXIcon } from 'components/icons';
import DownloadIcon from 'components/icons/DownloadIcon';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import { SmallTable } from 'components/SmallTable';
import useFetch from 'hooks/useFetch';
import { bytesToRead } from 'lib/utils/client';
import { updateUser } from 'lib/redux/reducers/user';
import { useStoreDispatch, useStoreSelector } from 'lib/redux/store';
import { useEffect, useState } from 'react';
import Flameshot from './Flameshot';
import ShareX from './ShareX';

function ExportDataTooltip({ children }) {
  return <Tooltip position='top' color='' label='After clicking, if you have a lot of files the export can take a while to complete. A list of previous exports will be below to download.'>{children}</Tooltip>;
}

export default function Manage() {
  const user = useStoreSelector(state => state.user);
  const dispatch = useStoreDispatch();
  const modals = useModals();

  const [shareXOpen, setShareXOpen] = useState(false);
  const [flameshotOpen, setFlameshotOpen] = useState(false);
  const [exports, setExports] = useState([]);
  const [file, setFile] = useState<File>(null);
  const [fileDataURL, setFileDataURL] = useState(user.avatar ?? null);

  const getDataURL = (f: File): Promise<string> => {
    return new Promise((res, rej) => {
      const reader = new FileReader();

      reader.addEventListener('load', () => {
        res(reader.result as string);
      });

      reader.addEventListener('error', () => {
        rej(reader.error);
      });

      reader.readAsDataURL(f);
    });
  };

  const handleAvatarChange = async (file: File) => {
    setFile(file);

    setFileDataURL(await getDataURL(file));
  };

  const saveAvatar = async () => {
    const dataURL = await getDataURL(file);

    showNotification({
      id: 'update-user',
      title: 'Updating user...',
      message: '',
      loading: true,
      autoClose: false,
    });

    const newUser = await useFetch('/api/user', 'PATCH', {
      avatar: dataURL,
    });

    if (newUser.error) {
      updateNotification({
        id: 'update-user',
        title: 'Couldn\'t save user',
        message: newUser.error,
        color: 'red',
        icon: <CrossIcon />,
      });
    } else {
      dispatch(updateUser(newUser));
      updateNotification({
        id: 'update-user',
        title: 'Saved User',
        message: '',
      });
    }
  };

  const form = useForm({
    initialValues: {
      username: user.username,
      password: '',
      embedTitle: user.embedTitle ?? '',
      embedColor: user.embedColor,
      embedSiteName: user.embedSiteName ?? '',
      domains: user.domains.join(','),
    },
  });

  const onSubmit = async values => {
    const cleanUsername = values.username.trim();
    const cleanPassword = values.password.trim();
    const cleanEmbedTitle = values.embedTitle.trim();
    const cleanEmbedColor = values.embedColor.trim();
    const cleanEmbedSiteName = values.embedSiteName.trim();

    if (cleanUsername === '') return form.setFieldError('username', 'Username can\'t be nothing');

    showNotification({
      id: 'update-user',
      title: 'Updating user...',
      message: '',
      loading: true,
      autoClose: false,
    });

    const data = {
      username: cleanUsername,
      password: cleanPassword === '' ? null : cleanPassword,
      embedTitle: cleanEmbedTitle === '' ? null : cleanEmbedTitle,
      embedColor: cleanEmbedColor === '' ? null : cleanEmbedColor,
      embedSiteName: cleanEmbedSiteName === '' ? null : cleanEmbedSiteName,
      domains: values.domains.split(/\s?,\s?/).map(x => x.trim()).filter(x => x !== ''),
    };

    const newUser = await useFetch('/api/user', 'PATCH', data);

    if (newUser.error) {
      if (newUser.invalidDomains) {
        updateNotification({
          id: 'update-user',
          message: <>
            <Text mt='xs'>The following domains are invalid:</Text>
            {newUser.invalidDomains.map(err => (
              <>
                <Text color='gray' key={randomId()}>{err.domain}: {err.reason}</Text>
                <Space h='md' />
              </>
            ))}
          </>,
          color: 'red',
          icon: <CrossIcon />,
        });
      }
      updateNotification({
        id: 'update-user',
        title: 'Couldn\'t save user',
        message: newUser.error,
        color: 'red',
        icon: <CrossIcon />,
      });
    } else {
      dispatch(updateUser(newUser));
      updateNotification({
        id: 'update-user',
        title: 'Saved User',
        message: '',
      });
    }
  };

  const exportData = async () => {
    const res = await useFetch('/api/user/export', 'POST');
    if (res.url) {
      showNotification({
        title: 'Export started...',
        loading: true,
        message: 'If you have a lot of files, the export may take a while. The list of exports will be updated every 30s.',
      });
    }
  };

  const getExports = async () => {
    const res = await useFetch('/api/user/export');

    setExports(res.exports.map(s => ({
      date: new Date(Number(s.name.split('_')[3].slice(0, -4))),
      size: s.size,
      full: s.name,
    })).sort((a, b) => a.date.getTime() - b.date.getTime()));
  };

  const handleDelete = async () => {
    const res = await useFetch('/api/user/files', 'DELETE', {
      all: true,
    });

    if (!res.count) {
      showNotification({
        title: 'Couldn\'t delete files',
        message: res.error,
        color: 'red',
        icon: <CrossIcon />,
      });
    } else {
      showNotification({
        title: 'Deleted files',
        message: `${res.count} files deleted`,
        color: 'green',
        icon: <DeleteIcon />,
      });
    }
  };

  const openDeleteModal = () => modals.openConfirmModal({
    title: 'Are you sure you want to delete all of your images?',
    closeOnConfirm: false,
    labels: { confirm: 'Yes', cancel: 'No' },
    onConfirm: () => {
      modals.openConfirmModal({
        title: 'Are you really sure?',
        labels: { confirm: 'Yes', cancel: 'No' },
        onConfirm: () => {
          handleDelete();
          modals.closeAll();
        },
        onCancel: () => {
          modals.closeAll();
        },
      });
    },
  });

  const interval = useInterval(() => getExports(), 30000);
  useEffect(() => {
    getExports();
    interval.start();
  }, []);

  return (
    <>
      <Title>Manage User</Title>
      <MutedText size='md'>Want to use variables in embed text? Visit <Link href='https://zipline.diced.tech/docs/guides/variables'>the docs</Link> for variables</MutedText>
      <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
        <TextInput id='username' label='Username' {...form.getInputProps('username')} />
        <PasswordInput id='password' label='Password' description='Leave blank to keep your old password' {...form.getInputProps('password')} />
        <TextInput id='embedTitle' label='Embed Title' {...form.getInputProps('embedTitle')} />
        <ColorInput id='embedColor' label='Embed Color' {...form.getInputProps('embedColor')} />
        <TextInput id='embedSiteName' label='Embed Site Name' {...form.getInputProps('embedSiteName')} />
        <TextInput id='domains' label='Domains' description='A list of domains separated by commas. These domains will be used to randomly output a domain when uploading. This is optional.' placeholder='https://example.com, https://example2.com' {...form.getInputProps('domains')} />

        <Group position='right' mt='md'>
          <Button
            type='submit'
          >Save User</Button>
        </Group>
      </form>

      <Box mb='md'>
        <Title>Avatar</Title>
        <FileInput placeholder='Click to upload a file' id='file' description='Add a custom avatar or leave blank for none' accept='image/png,image/jpeg,image/gif' value={file} onChange={handleAvatarChange} />
        <Card mt='md'>
          <Text>Preview:</Text>
          <Button
            leftIcon={fileDataURL ? <Image src={fileDataURL} height={32} radius='md' /> : <SettingsIcon />}
            sx={t => ({
              backgroundColor: '#00000000',
              '&:hover': {
                backgroundColor: t.other.hover,
              },
            })}
            size='xl'
            p='sm'
          >
            {user.username}
          </Button>
        </Card>

        <Group position='right' mt='md'>
          <Button onClick={() => { setFile(null); setFileDataURL(null); }} color='red'>Reset</Button>
          <Button onClick={saveAvatar} >Save Avatar</Button>
        </Group>
      </Box>

      <Box mb='md'>
        <Title>Manage Data</Title>
        <MutedText size='md'>Delete, or export your data into a zip file.</MutedText>
      </Box>

      <Group>
        <Button onClick={openDeleteModal} rightIcon={<DeleteIcon />} color='red'>Delete All Data</Button>
        <ExportDataTooltip><Button onClick={exportData} rightIcon={<DownloadIcon />}>Export Data</Button></ExportDataTooltip>
      </Group>
      <Card mt={22}>
        {exports && exports.length ? (
          <SmallTable
            columns={[
              { id: 'name', name: 'Name' },
              { id: 'date', name: 'Date' },
              { id: 'size', name: 'Size' },
            ]}
            rows={exports ? exports.map((x, i) => ({
              name: <Link href={'/api/user/export?name=' + x.full}>Export {i + 1}</Link>,
              date: x.date.toLocaleString(),
              size: bytesToRead(x.size),
            })) : []} />
        ) : (
          <Text>No exports yet</Text>
        )}
      </Card>

      <Title my='md'>Uploaders</Title>
      <Group>
        <Button size='xl' onClick={() => setShareXOpen(true)} rightIcon={<ShareXIcon />}>Generate ShareX Config</Button>
        <Button size='xl' onClick={() => setFlameshotOpen(true)} rightIcon={<FlameshotIcon />}>Generate Flameshot Script</Button>
      </Group>

      <ShareX user={user} open={shareXOpen} setOpen={setShareXOpen} />
      <Flameshot user={user} open={flameshotOpen} setOpen={setFlameshotOpen} />
    </>
  );
}
