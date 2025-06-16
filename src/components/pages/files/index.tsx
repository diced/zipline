import GridTableSwitcher from '@/components/GridTableSwitcher';
import { useViewStore } from '@/lib/store/view';
import { ActionIcon, Group, Title, Tooltip } from '@mantine/core';
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
      <Group justify='space-between'>
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
        </Group>

        <Group>
          <GridTableSwitcher type='files' />
        </Group>
      </Group>

      {view === 'grid' ? <Files /> : <FileTable />}
    </>
  );
}
