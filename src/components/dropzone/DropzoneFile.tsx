import { ActionIcon, Badge, Box, Card, Group, HoverCard, Table, useMantineTheme } from '@mantine/core';
import Type from 'components/Type';
import { X } from 'react-feather';

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
        {/* <Badge size='lg'>{file.name}</Badge> */}
        <Card shadow='sm' radius='sm' p='sm'>
          <Group position='center' spacing='xl'>
            {file.name}
          </Group>
        </Card>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        {/* x button that will remove file */}
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
            <X />
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
