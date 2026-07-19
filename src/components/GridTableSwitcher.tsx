import { GridSize, ViewStore, ViewType, useViewStore } from '@/lib/client/store/view';
import { Center, SegmentedControl, Tooltip } from '@mantine/core';
import { IconLayoutGrid, IconLayoutList } from '@tabler/icons-react';
import { useShallow } from 'zustand/shallow';

export default function GridTableSwitcher({
  type,
}: {
  type: Exclude<keyof ViewStore, 'setView' | 'setGridSize'>;
}) {
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

export function GridSizeSwitcher() {
  const [gridSize, setGridSize] = useViewStore(
    useShallow((state) => [state.filesGridSize, state.setGridSize]),
  );

  const data: { value: GridSize; label: string }[] = [
    { value: 'compact', label: 'S' },
    { value: 'normal', label: 'M' },
    { value: 'large', label: 'L' },
  ];

  return (
    <Tooltip label='Grid size'>
      <SegmentedControl size='xs' data={data} value={gridSize} onChange={(v) => setGridSize(v as GridSize)} />
    </Tooltip>
  );
}

export function getGridCols(size: GridSize): { base: number; md: number; lg: number; xl: number } {
  switch (size) {
    case 'compact':
      return { base: 3, md: 4, lg: 6, xl: 8 };
    case 'normal':
      return { base: 2, md: 3, lg: 4, xl: 6 };
    case 'large':
      return { base: 1, md: 2, lg: 3, xl: 4 };
    default:
      return { base: 2, md: 3, lg: 4, xl: 6 };
  }
}

export function getGridSkeletonHeight(size: GridSize): number {
  switch (size) {
    case 'compact':
      return 120;
    case 'normal':
      return 180;
    case 'large':
      return 260;
    default:
      return 180;
  }
}

export function getGridImageMaxHeight(size: GridSize): number {
  switch (size) {
    case 'compact':
      return 160;
    case 'normal':
      return 260;
    case 'large':
      return 380;
    default:
      return 260;
  }
}
