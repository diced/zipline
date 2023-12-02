import { ViewStore, ViewType, useViewStore } from '@/lib/store/view';
import { Center, SegmentedControl } from '@mantine/core';
import { IconLayoutGrid, IconLayoutList } from '@tabler/icons-react';

export default function GridTableSwitcher({ type }: { type: Exclude<keyof ViewStore, 'setView'> }) {
  const [view, setView] = useViewStore((state) => [state[type], state.setView]);

  return (
    <SegmentedControl
      ml='auto'
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
