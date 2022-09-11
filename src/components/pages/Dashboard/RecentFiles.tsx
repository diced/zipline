import { Card as MantineCard, SimpleGrid, Skeleton, Title } from '@mantine/core';
import { randomId } from '@mantine/hooks';
import File from 'components/File';
import NoData from 'components/icons/undraw/NoData';
import MutedText from 'components/MutedText';
import { invalidateFiles, useRecent } from 'lib/queries/files';

export default function RecentFiles() {
  const recent = useRecent('media');

  return (
    <>
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
                    <File key={randomId()} image={image} updateImages={invalidateFiles} />
                  ))
                ) : (
                  <MantineCard shadow='md' className='h-fit'>
                    <MantineCard.Section>
                      <div className='relative block w-fit mx-auto'>
                        <div className='align-middle px-6 py-12 inline-block max-w-[50%]'>
                          <NoData className='inline-block max-h-20 my-auto' />
                        </div>
                        <div className='align-middle my-auto w-fit inline-block'>
                          <Title>Nothing here</Title>
                          <MutedText size='md'>Upload some files and they will show up here.</MutedText>
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
    </>
  );
}