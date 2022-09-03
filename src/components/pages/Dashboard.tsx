import { SimpleGrid, Skeleton, Title, Card as MantineCard, useMantineTheme, Box } from '@mantine/core';
import { randomId, useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import Card from 'components/Card';
import File from 'components/File';
import { CopyIcon, CrossIcon, DeleteIcon, EnterIcon } from 'components/icons';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import { bytesToRead } from 'lib/clientUtils';
import useFetch from 'lib/hooks/useFetch';
import { useStoreSelector } from 'lib/redux/store';
import { DataGrid, dateFilterFn, stringFilterFn } from '@dicedtomato/mantine-data-grid';
import { useFiles, useRecent } from 'lib/queries/files';
import NoData from 'components/icons/undraw/NoData';
import { useStats } from 'lib/queries/stats';


export default function Dashboard() {
  const user = useStoreSelector(state => state.user);
  const theme = useMantineTheme();

  const images = useFiles();
  const recent = useRecent('media');
  const stats = useStats();
  const clipboard = useClipboard();

  const updateImages = () => {
    images.refetch();
    recent.refetch();
    stats.refetch();
  };

  const deleteImage = async ({ original }) => {
    const res = await useFetch('/api/user/files', 'DELETE', { id: original.id });
    if (!res.error) {
      updateImages();
      showNotification({
        title: 'Image Deleted',
        message: '',
        color: 'green',
        icon: <DeleteIcon />,
      });
    } else {
      showNotification({
        title: 'Failed to delete image',
        message: res.error,
        color: 'red',
        icon: <CrossIcon />,
      });
    }

  };

  const copyImage = async ({ original }) => {
    clipboard.copy(`${window.location.protocol}//${window.location.host}${original.url}`);
    showNotification({
      title: 'Copied to clipboard',
      message: '',
      icon: <CopyIcon />,
    });
  };

  const viewImage = async ({ original }) => {
    window.open(`${window.location.protocol}//${window.location.host}${original.url}`);
  };

  return (
    <>
      <Title>Welcome back, {user?.username}</Title>
      <MutedText size='md'>You have <b>{images.isSuccess ? images.data.length : '...'}</b> files</MutedText>

      <Title>Recent Files</Title>
      <SimpleGrid
        cols={(recent.isSuccess && recent.data.length === 0) ? 1 : 4}
        spacing='lg'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
        ]}
      >
        {
          recent.isSuccess
            ? (
              recent.data.length > 0 
                ? (
                  recent.data.map(image => (
                    <File key={randomId()} image={image} updateImages={updateImages} />
                  ))
                ) : (
                  <MantineCard shadow='md' className='h-fit'>
                    <MantineCard.Section>
                      <div className='relative block w-fit mx-auto'>
                        <div className='align-middle p-5 inline-block max-w-[50%]'>
                          <NoData className='inline-block max-h-20 my-auto' />
                        </div>
                        <div className='align-middle my-auto w-fit inline-block'>
                          <Title>Nothing here</Title>
                          <MutedText size='md'>Upload some files to get started</MutedText>
                        </div>
                      </div>
                    </MantineCard.Section>
                  </MantineCard>
                )
            ) : (
              [1, 2, 3, 4].map(x => (
                <div key={x}>
                  <Skeleton width='100%' height={220} sx={{ borderRadius: 1 }} />
                </div>
              ))
            )
        }
      </SimpleGrid>

      <Title mt='md'>Stats</Title>
      <MutedText size='md'>View more stats here <Link href='/dashboard/stats'>here</Link>.</MutedText>
      <SimpleGrid
        cols={3}
        spacing='lg'
        breakpoints={[
          { maxWidth: 'sm', cols: 1, spacing: 'sm' },
        ]}
      >
        <Card name='Size' sx={{ height: '100%' }}>
          <MutedText>{stats.isSuccess ? stats.data.size : <Skeleton height={8} />}</MutedText>
          <Title order={2}>Average Size</Title>
          <MutedText>{stats.isSuccess ? bytesToRead(stats.data.size_num / stats.data.count) : <Skeleton height={8} />}</MutedText>
        </Card>
        <Card name='Images' sx={{ height: '100%' }}>
          <MutedText>{stats.isSuccess ? stats.data.count : <Skeleton height={8} />}</MutedText>
          <Title order={2}>Views</Title>
          <MutedText>{stats.isSuccess ? `${stats.data.views_count} (${isNaN(stats.data.views_count / stats.data.count) ? 0 : Math.round(stats.data.views_count / stats.data.count)})` : <Skeleton height={8} />}</MutedText>
        </Card>
        <Card name='Users' sx={{ height: '100%' }}>
          <MutedText>{stats.isSuccess ? stats.data.count_users : <Skeleton height={8} />}</MutedText>
        </Card>
      </SimpleGrid>

      <Title mt='md'>Files</Title>
      <MutedText size='md'>View your gallery <Link href='/dashboard/files'>here</Link>.</MutedText>
      <DataGrid
        data={images.data ?? []}
        loading={images.isLoading}
        withPagination={true}
        withColumnResizing={false}
        withColumnFilters={true}
        noEllipsis={true}
        withSorting={true}
        highlightOnHover={true}
        CopyIcon={CopyIcon}
        DeleteIcon={DeleteIcon}
        EnterIcon={EnterIcon}
        deleteImage={deleteImage}
        // copyImage={copyImage}
        // viewImage={viewImage}
        styles={{
          dataCell: {
            width: '100%',
          },
          td: {
            ':nth-child(1)': {
              minWidth: 170,
            },
            ':nth-child(2)': {
              minWidth: 100,
            },
          },
          th: {
            ':nth-child(1)': {
              minWidth: 170,
              padding: theme.spacing.lg,
              borderTopLeftRadius: theme.radius.sm,
            },
            ':nth-child(2)': {
              minWidth: 100,
              padding: theme.spacing.lg,
            },
            ':nth-child(3)': {
              padding: theme.spacing.lg,
            },
            ':nth-child(4)': {
              padding: theme.spacing.lg,
              borderTopRightRadius: theme.radius.sm,
            },
          },
          thead: {
            backgroundColor: theme.colors.dark[6],
          },
        }}
        empty={<></>}

        columns={[
          {
            accessorKey: 'file',
            header: 'Name',
            filterFn: stringFilterFn,
          },
          {
            accessorKey: 'mimetype',
            header: 'Type',
            filterFn: stringFilterFn,
          },
          {
            accessorKey: 'created_at',
            header: 'Date',
            filterFn: dateFilterFn,
          },
        ]}
      />
    </>
  );
}