import React from 'react';
import { Dropzone as MantineDropzone } from '@mantine/dropzone';
import { Group, Text, useMantineTheme } from '@mantine/core';
import { ImageIcon } from 'components/icons';

export default function Dropzone({ loading, onDrop, children }) {
  const theme = useMantineTheme();

  return (
    <MantineDropzone onDrop={onDrop}>
      <Group position='center' spacing='xl' style={{ minHeight: 440 }}>
        <ImageIcon size={80} />

        <Text size='xl' inline>
          Drag files here or click to select files
        </Text>
      </Group>

      <div style={{ pointerEvents: 'all' }}>{children}</div>
    </MantineDropzone>
  );
}
