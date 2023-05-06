import { ActionIcon, Group, Stack, Table, Title, Tooltip } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconClipboardCopy, IconExternalLink } from '@tabler/icons-react';
import AnchorNext from 'components/AnchorNext';

export default function showFilesModal(clipboard, modals, files: string[]) {
  const open = (idx: number) => window.open(files[idx], '_blank');
  const copy = (idx: number) => {
    clipboard.copy(files[idx]);

    showNotification({
      title: 'Copied to clipboard',
      message: <AnchorNext href={files[idx]}>{files[idx]}</AnchorNext>,
      icon: <IconClipboardCopy size='1rem' />,
    });
  };

  modals.openModal({
    title: <Title>Uploaded Files</Title>,
    size: 'auto',
    children: (
      <Table withBorder={false} withColumnBorders={false} highlightOnHover horizontalSpacing={'sm'}>
        <Stack>
          {files.map((file, idx) => (
            <Group key={idx} position='apart'>
              <Group position='left'>
                <AnchorNext href={file}>{file}</AnchorNext>
              </Group>
              <Group position='right'>
                <Tooltip label='Open link in a new tab'>
                  <ActionIcon onClick={() => open(idx)} variant='filled' color='primary'>
                    <IconExternalLink size='1rem' />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label='Copy link to clipboard'>
                  <ActionIcon onClick={() => copy(idx)} variant='filled' color='primary'>
                    <IconClipboardCopy size='1rem' />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          ))}
        </Stack>
      </Table>
    ),
  });
}
