import { SettingsStore, ViewType, useSettingsStore } from '@/lib/store/settings';
import { Center, SegmentedControl, Tooltip } from '@mantine/core';
import { IconLayoutGrid, IconLayoutList } from '@tabler/icons-react';

export default function GridTableSwitcher({ type }: { type: keyof SettingsStore['view'] }) {
  const [view, setView] = useSettingsStore((state) => [state.view[type], state.setView]);

  return (
    <SegmentedControl
      sx={{ marginLeft: 'auto' }}
      size='xs'
      data={[
        {
          value: 'grid',
          label: (
            <Center>
              <IconLayoutGrid />
            </Center>
          ),
        },
        {
          value: 'table',
          label: (
            <Center>
              <IconLayoutList />
            </Center>
          ),
        },
      ]}
      value={view}
      onChange={(v) => setView(type, v as ViewType)}
    />
  );
}
