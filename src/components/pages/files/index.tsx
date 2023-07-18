import GridTableSwitcher from '@/components/GridTableSwitcher';
import { useViewStore } from '@/lib/store/view';
import { Group, Title } from '@mantine/core';
import FavoriteFiles from './views/FavoriteFiles';
import FileTable from './views/FileTable';
import Files from './views/Files';

export default function DashbaordFiles() {
  const view = useViewStore((state) => state.files);

  return (
    <>
      <Group>
        <Title>Files</Title>

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
