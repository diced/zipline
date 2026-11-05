import { ViewStore, ViewType, useViewStore } from '@/lib/client/store/view';
import { Center, SegmentedControl } from '@mantine/core';
import { IconLayoutGrid, IconLayoutList } from '@tabler/icons-react';
import { useShallow } from 'zustand/shallow';

export default function GridTableSwitcher({ type }: { type: Exclude<keyof ViewStore, 'setView'> }) {
  const [view, setView] = useViewStore(useShallow((state) => [state[type], state.setView]));

  return (
    <SegmentedControl
      ml='auto'
      size='xs'
      data={[
        {
          value: 'grid',
          label: (
            <Center>
              <IconLayoutGrid size='1rem' />
            </Center>
          ),
        },
        {
          value: 'table',
          label: (
            <Center>
              <IconLayoutList size='1rem' />
            </Center>
          ),
        },
      ]}
      value={view}
      onChange={(v) => setView(type, v as ViewType)}
    />
  );
}
