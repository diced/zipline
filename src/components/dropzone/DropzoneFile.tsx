import { ActionIcon, Box, Card, Group, HoverCard, Table, useMantineTheme } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
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

export default function FileDropzone({ file, onRemove }: { file: File; onRemove: () => void }) {
  const theme = useMantineTheme();

  return (
    <HoverCard shadow='md'>
      <HoverCard.Target>
        <Card shadow='sm' radius='sm' p='sm'>
          <Group position='center' spacing='xl'>
            {file.name}
          </Group>
        </Card>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 1,
            color: theme.colorScheme === 'dark' ? 'white' : 'white',
          }}
          m='xs'
        >
          <ActionIcon onClick={onRemove} size='sm' color='red' variant='filled'>
            <IconX />
          </ActionIcon>
        </Box>

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
