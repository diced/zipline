import { Box, Group, SimpleGrid, Text, useMantineTheme } from '@mantine/core';
import { Dropzone as MantineDropzone } from '@mantine/dropzone';
import { ImageIcon } from 'components/icons';

export default function Dropzone({ loading, onDrop, children }) {
  const theme = useMantineTheme();

  return (
    <SimpleGrid
      cols={2}
      breakpoints={[
        { maxWidth: 'md', cols: 1 },
        { maxWidth: 'xs', cols: 1 },
      ]}
    >
      <MantineDropzone onDrop={onDrop} styles={{ inner: { pointerEvents: 'none' } }}>
        <Group position='center' spacing='xl' style={{ minHeight: 440 }}>
          <ImageIcon size={80} />

          <Text size='xl' inline>
            Drag files here or click to select files
          </Text>
        </Group>
      </MantineDropzone>
      <Box>{children}</Box>
    </SimpleGrid>
  );
}
