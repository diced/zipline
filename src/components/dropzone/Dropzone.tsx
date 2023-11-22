import { Box, Group, SimpleGrid, Text } from '@mantine/core';
import { Dropzone as MantineDropzone } from '@mantine/dropzone';
import { IconPhoto } from '@tabler/icons-react';

export default function Dropzone({ loading, onDrop, children }) {
  return (
    <SimpleGrid
      cols={2}
      breakpoints={[
        { maxWidth: 'md', cols: 1 },
        { maxWidth: 'xs', cols: 1 },
      ]}
    >
      <MantineDropzone loading={loading} onDrop={onDrop} styles={{ inner: { pointerEvents: 'none' } }}>
        <Group position='center' spacing='xl' style={{ minHeight: 440, flexDirection: 'column' }}>
          <IconPhoto size={80} />

          <Text size='xl' inline>
            Drag files here or click to select files
          </Text>
        </Group>
      </MantineDropzone>
      <Box>{children}</Box>
    </SimpleGrid>
  );
}
