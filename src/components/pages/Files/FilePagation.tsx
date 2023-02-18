import { Box, Button, Center, Checkbox, Group, Pagination, SimpleGrid, Skeleton, Title } from '@mantine/core';
import File from 'components/File';
import { FileIcon } from 'components/icons';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { usePaginatedFiles } from 'lib/queries/files';
import { showNonMediaSelector } from 'lib/recoil/settings';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';

export default function FilePagation({ disableMediaPreview, exifEnabled, queryPage }) {
  const [checked, setChecked] = useRecoilState(showNonMediaSelector);
  const [numPages, setNumPages] = useState(Number(queryPage)); // just set it to the queryPage, since the req may have not loaded yet
  const [page, setPage] = useState(Number(queryPage));

  const router = useRouter();

  useEffect(() => {
    (async () => {
      router.replace(
        {
          query: {
            ...router.query,
            page: page,
          },
        },
        undefined,
        { shallow: true }
      );

      const { count } = await useFetch(`/api/user/paged?count=true${!checked ? '&filter=media' : ''}`);
      setNumPages(count);
    })();
  }, [page]);

  const pages = usePaginatedFiles(page, !checked ? 'media' : null);

  if (pages.isSuccess && pages.data.length === 0) {
    return (
      <Center sx={{ flexDirection: 'column' }}>
        <Group>
          <div>
            <FileIcon size={48} />
          </div>
          <div>
            <Title>Nothing here</Title>
            <MutedText size='md'>Upload some files and they will show up here.</MutedText>
          </div>
        </Group>
        <Box my='sm' hidden={checked}>
          <MutedText size='md'>
            There might be some non-media files, would you like to show them?
            <Button mx='sm' compact type='button' onClick={() => setChecked(true)}>
              Show
            </Button>
          </MutedText>
        </Box>
      </Center>
    );
  }

  return (
    <>
      <SimpleGrid cols={3} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
        {pages.isSuccess
          ? pages.data.length
            ? pages.data.map((image) => (
                <div key={image.id}>
                  <File
                    image={image}
                    disableMediaPreview={disableMediaPreview}
                    exifEnabled={exifEnabled}
                    refreshImages={pages.refetch}
                  />
                </div>
              ))
            : null
          : [1, 2, 3, 4].map((x) => (
              <div key={x}>
                <Skeleton width='100%' height={220} sx={{ borderRadius: 1 }} />
              </div>
            ))}
      </SimpleGrid>
      {pages.isSuccess && pages.data.length ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            paddingBottom: 3,
          }}
        >
          <div></div>
          <Pagination total={numPages} page={page} onChange={setPage} />
          <Checkbox
            label='Show non-media files'
            checked={checked}
            onChange={(event) => setChecked(event.currentTarget.checked)}
          />
        </Box>
      ) : null}
    </>
  );
}
