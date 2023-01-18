import {
  ActionIcon,
  Card,
  Group,
  LoadingOverlay,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { useFileDelete, useFileFavorite } from 'lib/queries/files';
import { relativeTime } from 'lib/utils/client';
import { useState } from 'react';
import {
  CalendarIcon,
  ClockIcon,
  CopyIcon,
  CrossIcon,
  DeleteIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileIcon,
  HashIcon,
  ImageIcon,
  StarIcon,
  InfoIcon,
} from './icons';
import MutedText from './MutedText';
import Type from './Type';

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

export default function File({ image, disableMediaPreview, exifEnabled }) {
  const [open, setOpen] = useState(false);
  const [overrideRender, setOverrideRender] = useState(false);
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

  return (
    <>
      <Modal opened={open} onClose={() => setOpen(false)} title={<Title>{image.name}</Title>} size='xl'>
        <LoadingOverlay visible={loading} />
        <Stack>
          <Type
            file={image}
            src={`/r/${image.name}`}
            alt={image.name}
            popup
            sx={{ minHeight: 200 }}
            style={{ minHeight: 200 }}
            disableMediaPreview={false}
            overrideRender={overrideRender}
            setOverrideRender={setOverrideRender}
          />
          <SimpleGrid
            my='md'
            cols={3}
            breakpoints={[
              { maxWidth: 600, cols: 1 },
              { maxWidth: 900, cols: 2 },
              { maxWidth: 1200, cols: 3 },
            ]}
          >
            <FileMeta Icon={FileIcon} title='Name' subtitle={image.name} />
            <FileMeta Icon={ImageIcon} title='Type' subtitle={image.mimetype} />
            <FileMeta Icon={EyeIcon} title='Views' subtitle={image?.views?.toLocaleString()} />
            {image.maxViews && (
              <FileMeta
                Icon={EyeIcon}
                title='Max views'
                subtitle={image?.maxViews?.toLocaleString()}
                tooltip={`This file will be deleted after being viewed ${image?.maxViews?.toLocaleString()} times.`}
              />
            )}
            <FileMeta
              Icon={CalendarIcon}
              title='Uploaded'
              subtitle={relativeTime(new Date(image.createdAt))}
              tooltip={new Date(image?.createdAt).toLocaleString()}
            />
            {image.expiresAt && (
              <FileMeta
                Icon={ClockIcon}
                title='Expires'
                subtitle={relativeTime(new Date(image.expiresAt))}
                tooltip={new Date(image.expiresAt).toLocaleString()}
              />
            )}
            <FileMeta Icon={HashIcon} title='ID' subtitle={image.id} />
          </SimpleGrid>
        </Stack>

        <Group position='apart' my='md'>
          <Group position='left'>
            {exifEnabled && (
              // <Link href={`/dashboard/metadata/${image.id}`} target='_blank' rel='noopener noreferrer'>
              //   <Button leftIcon={<ExternalLinkIcon />}>View Metadata</Button>
              // </Link>
              <Tooltip label='View Metadata'>
                <ActionIcon
                  color='blue'
                  variant='filled'
                  onClick={() => window.open(`/dashboard/metadata/${image.id}`, '_blank')}
                >
                  <InfoIcon />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
          <Group position='right'>
            <Tooltip label='Delete file'>
              <ActionIcon color='red' variant='filled' onClick={handleDelete}>
                <DeleteIcon />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={image.favorite ? 'Unfavorite' : 'Favorite'}>
              <ActionIcon
                color={image.favorite ? 'yellow' : 'gray'}
                variant='filled'
                onClick={handleFavorite}
              >
                <StarIcon />
              </ActionIcon>
            </Tooltip>

            <Tooltip label='Open in new tab'>
              <ActionIcon color='blue' variant='filled' onClick={() => window.open(image.url, '_blank')}>
                <ExternalLinkIcon />
              </ActionIcon>
            </Tooltip>

            <Tooltip label='Copy URL'>
              <ActionIcon color='blue' variant='filled' onClick={handleCopy}>
                <CopyIcon />
              </ActionIcon>
            </Tooltip>

            <Tooltip label='Download'>
              <ActionIcon
                color='blue'
                variant='filled'
                onClick={() => window.open(`/r/${image.name}?download=true`, '_blank')}
              >
                <DownloadIcon />
              </ActionIcon>
            </Tooltip>
          </Group>
          {/* {exifEnabled && (
            <Link href={`/dashboard/metadata/${image.id}`} target='_blank' rel='noopener noreferrer'>
              <Button leftIcon={<ExternalLinkIcon />}>View Metadata</Button>
            </Link>
          )}
          <Button onClick={handleCopy}>Copy URL</Button>
          <Button onClick={handleDelete}>Delete</Button>
          <Button onClick={handleFavorite}>{image.favorite ? 'Unfavorite' : 'Favorite'}</Button>
          <Link href={image.url} target='_blank'>
            <Button rightIcon={<ExternalLinkIcon />}>Open</Button>
          </Link> */}
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
            src={`/r/${image.name}`}
            alt={image.name}
            onClick={() => setOpen(true)}
            disableMediaPreview={disableMediaPreview}
          />
        </Card.Section>
      </Card>
    </>
  );
}
