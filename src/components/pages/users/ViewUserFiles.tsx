import GridTableSwitcher from '@/components/GridTableSwitcher';
import { User } from '@/lib/db/models/user';
import { useViewStore } from '@/lib/store/view';
import { ActionIcon, Group, Title, Tooltip } from '@mantine/core';
import FileTable from '../files/views/FileTable';
import Files from '../files/views/Files';
import Link from 'next/link';
import { IconArrowBackUp } from '@tabler/icons-react';

export default function ViewFiles({ user }: { user: User }) {
  if (!user) return null;

  const view = useViewStore((state) => state.files);

  return (
    <>
      <Group>
        <Title>{user.username}&apos;s files</Title>
        <Tooltip label='Back to users'>
          <ActionIcon variant='outline' component={Link} href='/dashboard/admin/users'>
            <IconArrowBackUp size='1rem' />
          </ActionIcon>
        </Tooltip>

        <GridTableSwitcher type='files' />
      </Group>

      {view === 'grid' ? <Files id={user.id} /> : <FileTable id={user.id} />}
    </>
  );
}
