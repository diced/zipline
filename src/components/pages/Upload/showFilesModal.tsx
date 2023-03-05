import { ActionIcon, Group, Stack, Table, Title, Tooltip } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconClipboardCopy, IconExternalLink } from '@tabler/icons-react';
import Link from 'components/Link';

export default function showFilesModal(clipboard, modals, files: string[]) {
  const open = (idx: number) => window.open(files[idx], '_blank');
  const copy = (idx: number) => {
    clipboard.copy(files[idx]);
    if (!navigator.clipboard)
      showNotification({
        title: 'Unable to copy to clipboard',
        message: 'Zipline is unable to copy to clipboard due to security reasons.',
        color: 'red',
      });
    else
      showNotification({
        title: 'Copied to clipboard',
        message: <Link href={files[idx]}>{files[idx]}</Link>,
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
                <Link href={file}>{file}</Link>
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
