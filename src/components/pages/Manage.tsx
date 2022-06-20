import React, { useEffect, useState } from 'react';

import useFetch from 'hooks/useFetch';
import Link from 'components/Link';
import { useStoreDispatch, useStoreSelector } from 'lib/redux/store';
import { updateUser } from 'lib/redux/reducers/user';
import { randomId, useForm, useInterval } from '@mantine/hooks';
import { Card, Tooltip, TextInput, Button, Text, Title, Group, ColorInput, MultiSelect, Space, Box, Table } from '@mantine/core';
import { DownloadIcon, Cross1Icon, TrashIcon } from '@modulz/radix-icons';
import { useNotifications } from '@mantine/notifications';
import { useModals } from '@mantine/modals';

function VarsTooltip({ children }) {
  return (
    <Tooltip position='top' placement='center' color='' label={
      <>
        <Text><b>{'{image.file}'}</b> - file name</Text>
        <Text><b>{'{image.mimetype}'}</b> - mimetype</Text>
        <Text><b>{'{image.id}'}</b> - id of the image</Text>
        <Text><b>{'{user.name}'}</b> - your username</Text>
        visit <Link href='https://zipline.diced.cf/docs/variables'>the docs</Link> for more variables
      </>
    }>
      {children}
    </Tooltip>
  );
}

function ExportDataTooltip({ children }) {
  return <Tooltip position='top' placement='center' color='' label='After clicking, if you have a lot of files the export can take a while to complete. A list of previous exports will be below to download.'>{children}</Tooltip>;
}

function ExportTable({ rows, columns }) {
  return (
    <Box sx={{ pt: 1 }} >
      <Table highlightOnHover>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={randomId()}>{col.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={randomId()}>
              {columns.map(col => (
                <td key={randomId()}>
                  {col.format ? col.format(row[col.id]) : row[col.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Box>
  );
}

export default function Manage() {
  const user = useStoreSelector(state => state.user);
  const dispatch = useStoreDispatch();
  const notif = useNotifications();
  const modals = useModals();

  const [exports, setExports] = useState([]);
  const [domains, setDomains] = useState(user.domains ?? []);

  const genShareX = (withEmbed: boolean = false, withZws: boolean = false) => {
    const config = {
      Version: '13.2.1',
      Name: 'Zipline',
      DestinationType: 'ImageUploader, TextUploader',
      RequestMethod: 'POST',
      RequestURL: `${window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '')}/api/upload`,
      Headers: {
        Authorization: user?.token,
        ...(withEmbed && { Embed: 'true' }),
        ...(withZws && { ZWS: 'true' }),
      },
      URL: '$json:files[0]$',
      Body: 'MultipartFormData',
      FileFormName: 'file',
    };

    const pseudoElement = document.createElement('a');
    pseudoElement.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, '\t')));
    pseudoElement.setAttribute('download', `zipline${withEmbed ? '_embed' : ''}${withZws ? '_zws' : ''}.sxcu`);
    pseudoElement.style.display = 'none';
    document.body.appendChild(pseudoElement);
    pseudoElement.click();
    pseudoElement.parentNode.removeChild(pseudoElement);
  };

  const form = useForm({
    initialValues: {
      username: user.username,
      password: '',
      embedTitle: user.embedTitle ?? '',
      embedColor: user.embedColor,
      embedSiteName: user.embedSiteName ?? '',
      domains: user.domains ?? [],
    },
  });

  const onSubmit = async values => {
    const cleanUsername = values.username.trim();
    const cleanPassword = values.password.trim();
    const cleanEmbedTitle = values.embedTitle.trim();
    const cleanEmbedColor = values.embedColor.trim();
    const cleanEmbedSiteName = values.embedSiteName.trim();

    if (cleanUsername === '') return form.setFieldError('username', 'Username can\'t be nothing');

    const id = notif.showNotification({
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
      domains,
    };

    const newUser = await useFetch('/api/user', 'PATCH', data);

    if (newUser.error) {
      if (newUser.invalidDomains) {
        notif.updateNotification(id, {
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
          icon: <Cross1Icon />,
        });
      }
      notif.updateNotification(id, {
        title: 'Couldn\'t save user',
        message: newUser.error,
        color: 'red',
        icon: <Cross1Icon />,
      });
    } else {
      dispatch(updateUser(newUser));
      notif.updateNotification(id, {
        title: 'Saved User',
        message: '',
      });
    }
  };

  const exportData = async () => {
    const res = await useFetch('/api/user/export', 'POST');
    if (res.url) {
      notif.showNotification({
        title: 'Export started...',
        loading: true,
        message: 'If you have a lot of files, the export may take a while. The list of exports will be updated every 30s.',
      });
    }
  };

  const getExports = async () => {
    const res = await useFetch('/api/user/export');

    setExports(res.exports.map(s => ({
      date: new Date(Number(s.split('_')[3].slice(0, -4))),
      full: s,
    })).sort((a, b) => a.date.getTime() - b.date.getTime()));
  };

  const handleDelete = async () => {
    const res = await useFetch('/api/user/files', 'DELETE', {
      all: true,
    });

    if (!res.count) {
      notif.showNotification({
        title: 'Couldn\'t delete files',
        message: res.error,
        color: 'red',
        icon: <Cross1Icon />,
      });
    } else {
      notif.showNotification({
        title: 'Deleted files',
        message: `${res.count} files deleted`,
        color: 'green',
        icon: <TrashIcon />,
      });
    }
  };

  const openDeleteModal = () => modals.openConfirmModal({
    title: 'Are you sure you want to delete all of your images?',
    closeOnConfirm: false,
    centered: true,
    overlayBlur: 3,
    labels: { confirm: 'Yes', cancel: 'No' },
    onConfirm: () => {
      modals.openConfirmModal({
        title: 'Are you really sure?',
        centered: true,
        overlayBlur: 3,
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
      <VarsTooltip>
        <Text color='gray'>Want to use variables in embed text? Hover on this or visit <Link href='https://zipline.diced.cf/docs/variables'>the docs</Link> for more variables</Text>
      </VarsTooltip>
      <form onSubmit={form.onSubmit((v) => onSubmit(v))}>
        <TextInput id='username' label='Username' {...form.getInputProps('username')} />
        <TextInput id='password' label='Password' type='password' {...form.getInputProps('password')} />
        <TextInput id='embedTitle' label='Embed Title' {...form.getInputProps('embedTitle')} />
        <ColorInput id='embedColor' label='Embed Color' {...form.getInputProps('embedColor')} />
        <TextInput id='embedSiteName' label='Embed Site Name' {...form.getInputProps('embedSiteName')} />
        <MultiSelect
          id='domains'
          label='Domains'
          data={domains}
          placeholder='Leave blank if you dont want random domain selection.'
          creatable
          searchable
          clearable
          getCreateLabel={query => `Add ${query}`}
          onCreate={query => setDomains((current) => [...current, query])}
          {...form.getInputProps('domains')}
        />

        <Group position='right' sx={{ paddingTop: 12 }}>
          <Button
            type='submit'
          >Save User</Button>
        </Group>
      </form>

      <Title sx={{ paddingTop: 12 }}>Manage Data</Title>
      <Text color='gray' sx={{ paddingBottom: 12 }}>Delete, or export your data into a zip file.</Text>
      <Group>
        <Button onClick={openDeleteModal} rightIcon={<TrashIcon />}>Delete All Data</Button>
        <ExportDataTooltip><Button onClick={exportData} rightIcon={<DownloadIcon />}>Export Data</Button></ExportDataTooltip>
      </Group>
      <Card mt={22}>
        <ExportTable
          columns={[
            { id: 'name', name: 'Name' },
            { id: 'date', name: 'Date' },
          ]}
          rows={exports ? exports.map((x, i) => ({
            name: <Link href={'/api/user/export?name=' + x.full}>Export {i + 1}</Link>,
            date: x.date.toLocaleString(),
          })) : []} />
      </Card>

      <Title sx={{ paddingTop: 12, paddingBottom: 12 }}>ShareX Config</Title>
      <Group>
        <Button onClick={() => genShareX(false)} rightIcon={<DownloadIcon />}>ShareX Config</Button>
        <Button onClick={() => genShareX(true)} rightIcon={<DownloadIcon />}>ShareX Config with Embed</Button>
        <Button onClick={() => genShareX(false, true)} rightIcon={<DownloadIcon />}>ShareX Config with ZWS</Button>
      </Group>
    </>
  );
}