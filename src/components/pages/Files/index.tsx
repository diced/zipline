import { Accordion, ActionIcon, Box, Group, Pagination, SimpleGrid, Title, Tooltip } from '@mantine/core';
import { IconFileUpload, IconPhotoUp } from '@tabler/icons-react';
import File from 'components/File';
import useFetch from 'hooks/useFetch';
import { usePaginatedFiles } from 'lib/queries/files';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import FilePagation from './FilePagation';
import PendingFilesModal from './PendingFilesModal';

export default function Files({ disableMediaPreview, exifEnabled, queryPage, compress }) {
  const [favoritePage, setFavoritePage] = useState(1);
  const [favoriteNumPages, setFavoriteNumPages] = useState(0);
  const favoritePages = usePaginatedFiles(favoritePage, {
    filter: 'media',
    favorite: true,
  });

  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { count } = await useFetch('/api/user/paged?count=true&filter=media&favorite=true');
      setFavoriteNumPages(count);
    })();
  });

  return (
    <>
      <PendingFilesModal open={open} onClose={() => setOpen(false)} />

      <Group mb='md'>
        <Title>Files</Title>
        <ActionIcon component={Link} href='/dashboard/upload/file' variant='filled' color='primary'>
          <IconFileUpload size='1rem' />
        </ActionIcon>

        <Tooltip label='View pending uploads'>
          <ActionIcon onClick={() => setOpen(true)} variant='filled' color='primary'>
            <IconPhotoUp size='1rem' />
          </ActionIcon>
        </Tooltip>
      </Group>
      {favoritePages.isSuccess && favoritePages.data.length ? (
        <Accordion
          variant='contained'
          mb='sm'
          styles={(t) => ({
            content: { backgroundColor: t.colorScheme === 'dark' ? t.colors.dark[7] : t.colors.gray[0] },
            control: { backgroundColor: t.colorScheme === 'dark' ? t.colors.dark[7] : t.colors.gray[0] },
          })}
        >
          <Accordion.Item value='favorite'>
            <Accordion.Control>Favorite Files</Accordion.Control>
            <Accordion.Panel>
              <SimpleGrid cols={3} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
                {favoritePages.isSuccess && favoritePages.data.length
                  ? favoritePages.data.map((image) => (
                      <div key={image.id}>
                        <File
                          image={image}
                          disableMediaPreview={disableMediaPreview}
                          exifEnabled={exifEnabled}
                          refreshImages={favoritePages.refetch}
                          onDash={compress}
                        />
                      </div>
                    ))
                  : null}
              </SimpleGrid>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingTop: 12,
                  paddingBottom: 3,
                }}
              >
                <Pagination total={favoriteNumPages} value={favoritePage} onChange={setFavoritePage} />
              </Box>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : null}

      <FilePagation
        disableMediaPreview={disableMediaPreview}
        exifEnabled={exifEnabled}
        queryPage={queryPage}
        compress={compress}
      />
    </>
  );
}
