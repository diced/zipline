import type { SafeConfig } from '@/lib/config/safe';
import { useViewStore } from '@/lib/store/view';
import { Group, Title } from '@mantine/core';
import FavoriteFiles from './views/FavoriteFiles';
import Files from './views/Files';
import FileTable from './views/FileTable';
import GridTableSwitcher from '@/components/GridTableSwitcher';

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
