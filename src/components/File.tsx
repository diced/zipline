import { Button, Card, Group, LoadingOverlay, Modal, Stack, Text, Title, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { relativeTime } from 'lib/utils/client';
import { useFileDelete, useFileFavorite } from 'lib/queries/files';
import { useState } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  CrossIcon,
  DeleteIcon,
  ExternalLinkIcon,
  FileIcon,
  HashIcon,
  ImageIcon,
  StarIcon,
  EyeIcon,
} from './icons';
import MutedText from './MutedText';
import Type from './Type';
import Link from './Link';

export function FileMeta({ Icon, title, subtitle, ...other }) {
  return other.tooltip ? (
    <Group>
      <Icon size={24} />
      <Tooltip label={other.tooltip}>
        <Stack spacing={1}>
          <Text>{title}</Text>
          <MutedText size='md'>{subtitle}</MutedText>
        </Stack>
      </Tooltip>
    </Group>
  ) : (
    <Group>
      <Icon size={24} />
      <Stack spacing={1}>
        <Text>{title}</Text>
        <MutedText size='md'>{subtitle}</MutedText>
      </Stack>
    </Group>
  );
}

export default function File({ image, updateImages, disableMediaPreview }) {
  const [open, setOpen] = useState(false);
  const deleteFile = useFileDelete();
  const favoriteFile = useFileFavorite();
  const clipboard = useClipboard();

  const loading = deleteFile.isLoading || favoriteFile.isLoading;

  const handleDelete = async () => {
    deleteFile.mutate(image.id, {
      onSuccess: () => {
        showNotification({
          title: 'File Deleted',
          message: '',
          color: 'green',
          icon: <DeleteIcon />,
        });
      },

      onError: (res: any) => {
        showNotification({
          title: 'Failed to delete file',
          message: res.error,
          color: 'red',
          icon: <CrossIcon />,
        });
      },

      onSettled: () => {
        setOpen(false);
      },
    });
  };

  const handleCopy = () => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${image.url}`);
    setOpen(false);
    showNotification({
      title: 'Copied to clipboard',
      message: '',
      icon: <CopyIcon />,
    });
  };

  const handleFavorite = async () => {
    favoriteFile.mutate(
      { id: image.id, favorite: !image.favorite },
      {
        onSuccess: () => {
          showNotification({
            title: 'Image is now ' + (!image.favorite ? 'favorited' : 'unfavorited'),
            message: '',
            icon: <StarIcon />,
          });
        },

        onError: (res: any) => {
          showNotification({
            title: 'Failed to favorite file',
            message: res.error,
            color: 'red',
            icon: <CrossIcon />,
          });
        },
      }
    );
  };

  console.log(image);
  return (
    <>
      <Modal opened={open} onClose={() => setOpen(false)} title={<Title>{image.file}</Title>} size='xl'>
        <LoadingOverlay visible={loading} />
        <Stack>
          <Type
            file={image}
            src={image.url}
            alt={image.file}
            popup
            sx={{ minHeight: 200 }}
            style={{ minHeight: 200 }}
            disableMediaPreview={false}
          />
          <Stack>
            <FileMeta Icon={FileIcon} title='Name' subtitle={image.file} />
            <FileMeta Icon={ImageIcon} title='Type' subtitle={image.mimetype} />
            <FileMeta Icon={EyeIcon} title='Views' subtitle={image.views} />
            <FileMeta
              Icon={CalendarIcon}
              title='Uploaded at'
              subtitle={new Date(image.created_at).toLocaleString()}
            />
            {image.expires_at && (
              <FileMeta
                Icon={ClockIcon}
                title='Expires'
                subtitle={relativeTime(new Date(image.expires_at))}
                tooltip={new Date(image.expires_at).toLocaleString()}
              />
            )}
            <FileMeta Icon={HashIcon} title='ID' subtitle={image.id} />
          </Stack>
        </Stack>

        <Group position='right' mt='md'>
          <Link href={image.url} target='_blank'>
            <Button rightIcon={<ExternalLinkIcon />}>Open</Button>
          </Link>
          <Button onClick={handleCopy}>Copy URL</Button>
          <Button onClick={handleDelete}>Delete</Button>
          <Button onClick={handleFavorite}>{image.favorite ? 'Unfavorite' : 'Favorite'}</Button>
        </Group>
      </Modal>
      <Card sx={{ maxWidth: '100%', height: '100%' }} shadow='md'>
        <Card.Section>
          <LoadingOverlay visible={loading} />
          <Type
            file={image}
            sx={{
              minHeight: 200,
              maxHeight: 320,
              fontSize: 70,
              width: '100%',
              cursor: 'pointer',
            }}
            style={{
              minHeight: 200,
              maxHeight: 320,
              fontSize: 70,
              width: '100%',
              cursor: 'pointer',
            }}
            src={image.url}
            alt={image.file}
            onClick={() => setOpen(true)}
            disableMediaPreview={disableMediaPreview}
          />
        </Card.Section>
      </Card>
    </>
  );
}
