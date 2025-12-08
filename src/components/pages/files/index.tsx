import GridTableSwitcher from '@/components/GridTableSwitcher';
import { useViewStore } from '@/lib/store/view';
import { ActionIcon, Group, Title, Tooltip } from '@mantine/core';
import FavoriteFiles from './views/FavoriteFiles';
import FileTable from './views/FileTable';
import Files from './views/Files';
import TagsButton from './tags/TagsButton';
import PendingFilesButton from './PendingFilesButton';
import { IconFileUpload, IconGridPatternFilled, IconTableOptions } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function DashboardFiles() {
  const view = useViewStore((state) => state.files);

  const [tableEditOpen, setTableEditOpen] = useState(false);
  const [idSearchOpen, setIdSearchOpen] = useState(false);

  return (
    <>
      <Group>
        <Title>Files</Title>

        <Tooltip label='Upload a file'>
          <Link to='/dashboard/upload/file'>
            <ActionIcon variant='outline'>
              <IconFileUpload size='1rem' />
            </ActionIcon>
          </Link>
        </Tooltip>

        <TagsButton />
        <PendingFilesButton />

        {view === 'table' && (
          <>
            <Tooltip label='Table Options'>
              <ActionIcon variant='outline' onClick={() => setTableEditOpen((open) => !open)}>
                <IconTableOptions size='1rem' />
              </ActionIcon>
            </Tooltip>

            <Tooltip label='Search by ID'>
              <ActionIcon
                variant='outline'
                onClick={() => {
                  setIdSearchOpen((open) => !open);
                }}
              >
                <IconGridPatternFilled size='1rem' />
              </ActionIcon>
            </Tooltip>
          </>
        )}

        <GridTableSwitcher type='files' />
      </Group>

      {view === 'grid' ? (
        <>
          <FavoriteFiles />

          <Files />
        </>
      ) : (
        <FileTable
          idSearch={{
            open: idSearchOpen,
            setOpen: setIdSearchOpen,
          }}
          tableEdit={{
            open: tableEditOpen,
            setOpen: setTableEditOpen,
          }}
        />
      )}
    </>
  );
}
