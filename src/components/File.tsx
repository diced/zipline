import { Button, Card, Group, Image as MImage, Modal, Title } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useNotifications } from '@mantine/notifications';
import useFetch from 'hooks/useFetch';
import { useState } from 'react';
import { CopyIcon, CrossIcon, DeleteIcon, StarIcon } from './icons';

export default function File({ image, updateImages }) {
  const [open, setOpen] = useState(false);
  const [t] = useState(image.mimetype.split('/')[0]);
  const notif = useNotifications();
  const clipboard = useClipboard();
  
  const handleDelete = async () => {
    const res = await useFetch('/api/user/files', 'DELETE', { id: image.id });
    if (!res.error) {
      updateImages(true);
      notif.showNotification({
        title: 'Image Deleted',
        message: '',
        color: 'green',
        icon: <DeleteIcon />,
      });
    } else {
      notif.showNotification({
        title: 'Failed to delete image',
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

  const Type = (props) => {
    return {
      'video': <video controls {...props} />,
      'image': <MImage withPlaceholder {...props} />,
      'audio': <audio controls {...props} />,
    }[t];
  };

  return (
    <>
      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title={<Title>{image.file}</Title>}
      >
        <Type
          src={image.url}
          alt={image.file}
        />
        <Group position='right' mt={22}>
          <Button onClick={handleCopy}>Copy</Button>
          <Button onClick={handleDelete}>Delete</Button>
          <Button onClick={handleFavorite}>{image.favorite ? 'Unfavorite' : 'Favorite'}</Button>
        </Group>
      </Modal>
      <Card sx={{ maxWidth: '100%', height: '100%' }} shadow='md'>
        <Card.Section>
          <Type
            sx={{ maxHeight: 320, fontSize: 70, width: '100%', cursor: 'pointer' }}
            style={{ maxHeight: 320, fontSize: 70, width: '100%', cursor: 'pointer' }}
            src={image.url}
            alt={image.file}
            onClick={() => setOpen(true)}
          />
        </Card.Section>
      </Card>
    </>
  );
}