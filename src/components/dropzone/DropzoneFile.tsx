import React from 'react';
import { Table, Tooltip, Badge, useMantineTheme } from '@mantine/core';
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
      popup
    />
  );
}

export default function FileDropzone({ file }: { file: File }) {
  const theme = useMantineTheme();

  return (
    <Tooltip
      position='top'
      label={
        <div style={{ display: 'flex', alignItems: 'center' }}>
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
        </div>
      }
    >
      <Badge size='lg'>
        {file.name}
      </Badge>
    </Tooltip>
  );
}