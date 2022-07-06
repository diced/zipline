/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Image, Table, Tooltip, Badge, useMantineTheme } from '@mantine/core';

export function FilePreview({ file }: { file: File }) {
  const Type = props => {
    return {
      'video': <video autoPlay controls {...props} />,
      'image': <Image withPlaceholder {...props} />,
      'audio': <audio autoPlay controls {...props} />,
    }[file.type.split('/')[0]];
  };

  return (
    <Type
      sx={{ maxWidth: '10vw', maxHeight: '100vh' }}
      style={{ maxWidth: '10vw', maxHeight: '100vh' }}
      src={URL.createObjectURL(file)}
      alt={file.name}
    />
  );
}

export default function FileDropzone({ file }: { file: File }) {
  const theme = useMantineTheme();

  return (
    <Tooltip
      position='top'
      placement='center'
      allowPointerEvents
      label={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FilePreview file={file} />

          <Table sx={{ color: theme.colorScheme === 'dark' ? 'black' : 'white' }} ml='md'>
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
        </div>
      }
    >
      <Badge size='lg'>
        {file.name}
      </Badge>
    </Tooltip>
  );
}