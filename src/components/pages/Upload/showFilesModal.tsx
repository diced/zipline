import { Button, Table, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { CopyIcon } from 'components/icons';
import Link from 'components/Link';

export default function showFilesModal(clipboard, modals, files: string[]) {
  const open = (idx: number) => window.open(files[idx], '_blank');
  const copy = (idx: number) => {
    clipboard.copy(files[idx]);
    showNotification({
      title: 'Copied to clipboard',
      message: <Link href={files[idx]}>{files[idx]}</Link>,
      icon: <CopyIcon />,
    });
  };

  modals.openModal({
    title: <Title>Uploaded Files</Title>,
    size: 'auto',
    children: (
      <Table withBorder={false} withColumnBorders={false} highlightOnHover horizontalSpacing={'sm'}>
        <tbody>
          {files.map((file, idx) => (
            <tr key={file}>
              <td>
                <Link href={file}>{file}</Link>
              </td>
              <td>
                <Button.Group>
                  <Button variant='outline' onClick={() => copy(idx)}>
                    Copy
                  </Button>
                  <Button variant='outline' onClick={() => open(idx)}>
                    Open
                  </Button>
                </Button.Group>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    ),
  });
}
