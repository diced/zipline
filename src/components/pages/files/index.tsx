import type { SafeConfig } from '@/lib/config/safe';
import { useSettingsStore } from '@/lib/store/settings';
import { Group, Title } from '@mantine/core';
import FavoriteFiles from './views/FavoriteFiles';
import Files from './views/Files';
import FileTable from './views/FileTable';
import GridTableSwitcher from '@/components/GridTableSwitcher';

export default function DashbaordFiles() {
  const view = useSettingsStore((state) => state.view.files);

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
