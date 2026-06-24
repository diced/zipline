import { type loader } from '@/client/pages/dashboard/admin/users/[id]/files';
import GridTableSwitcher from '@/components/GridTableSwitcher';
import { useViewStore } from '@/lib/client/store/view';
import { ActionIcon, Group, Title, Tooltip } from '@mantine/core';
import { IconArrowBackUp, IconGridPatternFilled, IconTableOptions } from '@tabler/icons-react';
import { Link, useLoaderData } from 'react-router-dom';
import { useModals } from '../files';
import FilesGridView from '../files/views/FilesGridView';
import FilesTableView from '../files/views/FilesTableView';

export default function ViewUserFiles() {
  const data = useLoaderData<typeof loader>();

  const view = useViewStore((state) => state.files);
  const [modals, setModals] = useModals();

  if (!data) return;

  const { user } = data;
  if (!user) return;

  return (
    <>
      <Group>
        <Title>{user.username}&apos;s files</Title>
        <Tooltip label='Back to users'>
          <ActionIcon variant='outline' component={Link} to='/dashboard/admin/users'>
            <IconArrowBackUp size='1rem' />
          </ActionIcon>
        </Tooltip>

        <Tooltip label='Table Options'>
          <ActionIcon variant='outline' onClick={() => setModals({ table: !modals.table })}>
            <IconTableOptions size='1rem' />
          </ActionIcon>
        </Tooltip>

        <Tooltip label='Search by ID'>
          <ActionIcon variant='outline' onClick={() => setModals({ idSearch: !modals.idSearch })}>
            <IconGridPatternFilled size='1rem' />
          </ActionIcon>
        </Tooltip>

        <GridTableSwitcher type='files' />
      </Group>

      {view === 'grid' ? (
        <FilesGridView id={user.id} />
      ) : (
        <FilesTableView id={user.id} modals={modals} setModals={setModals} />
      )}
    </>
  );
}
