import React from 'react';
import { Table, Tooltip, Badge, HoverCard, Text, useMantineTheme, Group } from '@mantine/core';
import Type from 'components/Type';

export function FilePreview({ file }: { file: File }) {
  return (
    <Type
      file={file}
      autoPlay
      sx={{ maxWidth: '10vw', maxHeight: '100vh' }}
      style={{ maxWidth: '10vw', maxHeight: '100vh' }}
      src={URL.createObjectURL(file)}
      alt={file.name}
      disableMediaPreview={false}
      popup
    />
  );
}

export default function FileDropzone({ file }: { file: File }) {
  const theme = useMantineTheme();

  return (
    <HoverCard shadow='md'>
      <HoverCard.Target>
        <Badge size='lg'>{file.name}</Badge>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Group grow>
          <FilePreview file={file} />

          <Table sx={{ color: theme.colorScheme === 'dark' ? 'white' : 'white' }} ml='md'>
            <tbody>
              <tr>
                <td>Name</td>
                <td>{file.name}</td>
              </tr>
              <tr>
                <td>Type</td>
                <td>{file.type}</td>
              </tr>
              <tr>
                <td>Last Modified</td>
                <td>{new Date(file.lastModified).toLocaleString()}</td>
              </tr>
            </tbody>
          </Table>
        </Group>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
