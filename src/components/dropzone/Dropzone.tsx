import React from 'react';
import { Dropzone as MantineDropzone } from '@mantine/dropzone';
import { Group, Text, useMantineTheme } from '@mantine/core';
import { CrossIcon, UploadIcon, ImageIcon } from 'components/icons';

function ImageUploadIcon({ status, ...props }) {
  if (status.accepted) {
    return <UploadIcon {...props} />;
  }

  if (status.rejected) {
    return <CrossIcon {...props} />;
  }

  return <ImageIcon {...props} />;
}

function getIconColor(status, theme) {
  return status.accepted
    ? theme.colors[theme.primaryColor][6]
    : status.rejected
      ? theme.colors.red[6]
      : theme.colorScheme === 'dark'
        ? theme.colors.dark[0]
        : theme.black;
}


export default function Dropzone({ loading, onDrop, children }) {
  const theme = useMantineTheme();

  return (
    <MantineDropzone loading={loading} onDrop={onDrop}>
      {status => (
        <>
          <Group position='center' spacing='xl' style={{ minHeight: 440, pointerEvents: 'none' }}>
            <ImageUploadIcon
              status={status}
              style={{ width: 80, height: 80, color: getIconColor(status, theme) }}
            />

            <Text size='xl' inline>
              Drag images here or click to select files
            </Text>
          </Group>

          {children}
        </>
      )}
    </MantineDropzone>
  );
}