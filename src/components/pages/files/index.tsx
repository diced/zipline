import GridTableSwitcher from '@/components/GridTableSwitcher';
import { useViewStore } from '@/lib/store/view';
import { ActionIcon, Group, Title, Tooltip } from '@mantine/core';
import FavoriteFiles from './views/FavoriteFiles';
import FileTable from './views/FileTable';
import Files from './views/Files';
import TagsButton from './tags/TagsButton';
import PendingFilesButton from './PendingFilesButton';
import Link from 'next/link';
import { IconFileUpload } from '@tabler/icons-react';

export default function DashbaordFiles() {
  const view = useViewStore((state) => state.files);

  return (
    <>
      <Group>
        <Title>Files</Title>

        <Tooltip label='Upload a file'>
          <Link href='/dashboard/upload/file'>
            <ActionIcon variant='outline'>
              <IconFileUpload size='1rem' />
            </ActionIcon>
          </Link>
        </Tooltip>

        <TagsButton />
        <PendingFilesButton />

        <GridTableSwitcher type='files' />
      </Group>

      {view === 'grid' ? (
        <>
          <FavoriteFiles />

          <Files />
        </>
      ) : (
        <FileTable />
      )}
    </>
  );
}
