import { Button, Card, Grid, Group, Image as MImage, Modal, Stack, Text, Title, useMantineTheme } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useNotifications } from '@mantine/notifications';
import useFetch from 'hooks/useFetch';
import { useState } from 'react';
import Type from './Type';
import { CalendarIcon, CopyIcon, CrossIcon, DeleteIcon, FileIcon, HashIcon, ImageIcon, StarIcon } from './icons';
import MutedText from './MutedText';

export function FileMeta({ Icon, title, subtitle }) {
  return (
    <Group>
      <Icon size={24} />
      <Stack spacing={1}>
        <Text>{title}</Text>
        <MutedText size='md'>{subtitle}</MutedText>
      </Stack>
    </Group>
  );
}

export default function File({ image, updateImages }) {
  const [open, setOpen] = useState(false);
  const notif = useNotifications();
  const clipboard = useClipboard();
  const theme = useMantineTheme();

  const handleDelete = async () => {
    const res = await useFetch('/api/user/files', 'DELETE', { id: image.id });
    if (!res.error) {
      updateImages(true);
      notif.showNotification({
        title: 'File Deleted',
        message: '',
        color: 'green',
        icon: <DeleteIcon />,
      });
    } else {
      notif.showNotification({
        title: 'Failed to delete file',
        message: res.error,
        color: 'red',
        icon: <CrossIcon />,
      });
    }

    setOpen(false);
  };

  const handleCopy = () => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${image.url}`);
    setOpen(false);
    notif.showNotification({
      title: 'Copied to clipboard',
      message: '',
      icon: <CopyIcon />,
    });
  };

  const handleFavorite = async () => {
    const data = await useFetch('/api/user/files', 'PATCH', { id: image.id, favorite: !image.favorite });
    if (!data.error) updateImages(true);
    notif.showNotification({
      title: 'Image is now ' + (!image.favorite ? 'favorited' : 'unfavorited'),
      message: '',
      icon: <StarIcon />,
    });
  };


  return (
    <>
      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title={<Title>{image.file}</Title>}
        size='xl'
        overlayBlur={3}
        overlayColor={theme.colorScheme === 'dark' ? theme.colors.dark[6] : 'white'}
      >
        <Stack>
          <Type
            file={image}
            src={image.url}
            alt={image.file}
            popup
            sx={{ minHeight: 200 }}
            style={{ minHeight: 200 }}
          />
          <Stack>
            <FileMeta Icon={FileIcon} title='Name' subtitle={image.file} />
            <FileMeta Icon={ImageIcon} title='Type' subtitle={image.mimetype} />
            <FileMeta Icon={CalendarIcon} title='Uploaded at' subtitle={new Date(image.created_at).toLocaleString()} />
            <FileMeta Icon={HashIcon} title='ID' subtitle={image.id} />
          </Stack>
        </Stack>

        <Group position='right' mt={22}>
          <Button onClick={handleCopy}>Copy</Button>
          <Button onClick={handleDelete}>Delete</Button>
          <Button onClick={handleFavorite}>{image.favorite ? 'Unfavorite' : 'Favorite'}</Button>
        </Group>
      </Modal>
      <Card sx={{ maxWidth: '100%', height: '100%' }} shadow='md'>
        <Card.Section>
          <Type
            file={image}
            sx={{ minHeight: 200, maxHeight: 320, fontSize: 70, width: '100%', cursor: 'pointer' }}
            style={{ minHeight: 200, maxHeight: 320, fontSize: 70, width: '100%', cursor: 'pointer' }}
            src={image.url}
            alt={image.file}
            onClick={() => setOpen(true)}
          />
        </Card.Section>
      </Card>
    </>
  );
}