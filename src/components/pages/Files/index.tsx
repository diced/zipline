import { Accordion, ActionIcon, Box, Group, Pagination, SimpleGrid, Title } from '@mantine/core';
import File from 'components/File';
import { PlusIcon } from 'components/icons';
import { usePaginatedFiles } from 'lib/queries/files';
import Link from 'next/link';
import { useState } from 'react';
import FilePagation from './FilePagation';

export default function Files({ disableMediaPreview, exifEnabled }) {
  const pages = usePaginatedFiles({ filter: 'media' });
  const favoritePages = usePaginatedFiles({ favorite: 'media' });
  const [favoritePage, setFavoritePage] = useState(1);

  const updatePages = async (favorite) => {
    pages.refetch();

    if (favorite) {
      favoritePages.refetch();
    }
  };

  return (
    <>
      <Group mb='md'>
        <Title>Files</Title>
        <Link href='/dashboard/upload' passHref legacyBehavior>
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
                  ? favoritePages.data[favoritePage - 1 ?? 0].map((image) => (
                      <div key={image.id}>
                        <File
                          image={image}
                          updateImages={() => updatePages(true)}
                          disableMediaPreview={disableMediaPreview}
                          exifEnabled={exifEnabled}
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
                <Pagination
                  total={favoritePages.data.length}
                  page={favoritePage}
                  onChange={setFavoritePage}
                />
              </Box>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : null}

      <FilePagation disableMediaPreview={disableMediaPreview} exifEnabled={exifEnabled} />
    </>
  );
}
