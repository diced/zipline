import { Card as MantineCard, Center, Group, SimpleGrid, Skeleton, Title } from '@mantine/core';
import { randomId } from '@mantine/hooks';
import { IconCloudUpload } from '@tabler/icons-react';
import File from 'components/File';
import MutedText from 'components/MutedText';
import { useRecent } from 'lib/queries/files';

export default function RecentFiles({ disableMediaPreview, exifEnabled, compress }) {
  const recent = useRecent('media');

  return (
    <>
      <Title mt='sm'>Recent Files</Title>
      <SimpleGrid
        cols={recent.isSuccess && recent.data.length === 0 ? 1 : 4}
        spacing='lg'
        breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}
      >
        {recent.isSuccess ? (
          recent.data.length > 0 ? (
            recent.data.map((image) => (
              <File
                key={randomId()}
                image={image}
                disableMediaPreview={disableMediaPreview}
                exifEnabled={exifEnabled}
                refreshImages={recent.refetch}
                onDash={compress}
              />
            ))
          ) : (
            <MantineCard shadow='md'>
              <Center>
                <Group>
                  <div>
                    <IconCloudUpload size={48} />
                  </div>
                  <div>
                    <Title>Nothing here</Title>
                    <MutedText size='md'>Upload some files and they will show up here.</MutedText>
                  </div>
                </Group>
              </Center>
            </MantineCard>
          )
        ) : (
          [1, 2, 3, 4].map((x) => (
            <div key={x}>
              <Skeleton width='100%' height={220} sx={{ borderRadius: 1 }} />
            </div>
          ))
        )}
      </SimpleGrid>
    </>
  );
}
