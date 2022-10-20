import { Box, Center, Checkbox, Group, Pagination, SimpleGrid, Skeleton, Text, Title } from '@mantine/core';
import File from 'components/File';
import { FileIcon } from 'components/icons';
import MutedText from 'components/MutedText';
import { usePaginatedFiles } from 'lib/queries/files';
import { useState } from 'react';

export default function FilePagation({ disableMediaPreview }) {
  const [checked, setChecked] = useState(false);

  const pages = usePaginatedFiles(!checked ? { filter: 'media' } : {});
  const [page, setPage] = useState(1);

  if (pages.isSuccess && pages.data.length === 0) {
    return (
      <Center>
        <Group>
          <div>
            <FileIcon size={48} />
          </div>
          <div>
            <Title>Nothing here</Title>
            <MutedText size='md'>Upload some files and they will show up here.</MutedText>
          </div>
        </Group>
      </Center>
    );
  }

  return (
    <>
      <SimpleGrid cols={3} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
        {pages.isSuccess
          ? pages.data.length
            ? pages.data[page - 1 ?? 0].map((image) => (
                <div key={image.id}>
                  <File
                    image={image}
                    updateImages={() => pages.refetch()}
                    disableMediaPreview={disableMediaPreview}
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
          <Pagination total={pages.data?.length ?? 0} page={page} onChange={setPage} />
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
