import { Accordion, ActionIcon, Box, Group, Pagination, SimpleGrid, Title } from '@mantine/core';
import File from 'components/File';
import { PlusIcon } from 'components/icons';
import useFetch from 'hooks/useFetch';
import { usePaginatedFiles } from 'lib/queries/files';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import FilePagation from './FilePagation';

export default function Files({ disableMediaPreview, exifEnabled, queryPage }) {
  const [favoritePage, setFavoritePage] = useState(1);
  const [favoriteNumPages, setFavoriteNumPages] = useState(0);
  const favoritePages = usePaginatedFiles(favoritePage, 'media', true);

  useEffect(() => {
    (async () => {
      const { count } = await useFetch('/api/user/paged?count=true&filter=media&favorite=true');
      setFavoriteNumPages(count);
    })();
  });

  return (
    <>
      <Group mb='md'>
        <Title>Files</Title>
        <Link href='/dashboard/upload/file' passHref legacyBehavior>
          <ActionIcon component='a' variant='filled' color='primary'>
            <PlusIcon />
          </ActionIcon>
        </Link>
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
                <Pagination total={favoriteNumPages} page={favoritePage} onChange={setFavoritePage} />
              </Box>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : null}

      <FilePagation
        disableMediaPreview={disableMediaPreview}
        exifEnabled={exifEnabled}
        queryPage={queryPage}
      />
    </>
  );
}
