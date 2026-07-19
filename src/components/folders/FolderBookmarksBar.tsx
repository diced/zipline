import { useFolders } from '@/lib/client/hooks/useFolders';
import { buildFolderHierarchy } from '@/lib/folderHierarchy';
import { Button, Group, Menu, Text } from '@mantine/core';
import { IconChevronDown, IconFolder } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const GAP = 8;
const MORE_WIDTH = 80;

export default function FolderBookmarksBar({
  folderId,
  onChange,
  user,
}: {
  folderId?: string | null;
  onChange: (folderId: string | null) => void;
  user?: string;
}) {
  const { data: folders } = useFolders(user);
  const folderOptions = useMemo(() => {
    if (!folders) return [];
    return [{ id: '', name: 'All folders', path: 'All folders', depth: 0 }, ...buildFolderHierarchy(folders)];
  }, [folders]);

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(folderOptions.length);

  const measure = () => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const containerWidth = container.offsetWidth;
    const children = Array.from(measure.children) as HTMLElement[];
    let used = 0;
    let count = 0;

    for (let i = 0; i < children.length; i++) {
      const itemWidth = children[i].offsetWidth + GAP;
      const remaining = children.length - i - 1;
      const needsMore = remaining > 0;
      const available = containerWidth - (needsMore ? MORE_WIDTH : 0);

      if (used + itemWidth <= available) {
        used += itemWidth;
        count++;
      } else {
        break;
      }
    }

    setVisibleCount(Math.max(1, count));
  };

  useEffect(() => {
    measure();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(container);

    return () => observer.disconnect();
  }, [folderOptions.length]);

  if (!folders || folderOptions.length === 0) return null;

  const visible = folderOptions.slice(0, visibleCount);
  const overflow = folderOptions.slice(visibleCount);

  const isActive = (folder: (typeof folderOptions)[number]) =>
    folderId === folder.id || (folder.id === '' && !folderId);

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0 }}>
      <Group gap={GAP} wrap='nowrap' style={{ overflow: 'hidden' }}>
        {visible.map((folder) => (
          <Button
            key={folder.id}
            variant={isActive(folder) ? 'filled' : 'light'}
            size='compact-xs'
            leftSection={folder.id === '' ? undefined : <IconFolder size='0.9rem' />}
            onClick={() => onChange(folder.id === '' ? null : folder.id)}
            style={{ flexShrink: 0 }}
          >
            <Text size='xs' truncate maw={160}>
              {folder.name}
            </Text>
          </Button>
        ))}

        {overflow.length > 0 && (
          <Menu position='bottom-start' withinPortal={false}>
            <Menu.Target>
              <Button
                variant='light'
                size='compact-xs'
                rightSection={<IconChevronDown size='0.9rem' />}
                style={{ flexShrink: 0 }}
              >
                More
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {overflow.map((folder) => (
                <Menu.Item
                  key={folder.id}
                  leftSection={folder.id === '' ? undefined : <IconFolder size='0.9rem' />}
                  onClick={() => onChange(folder.id === '' ? null : folder.id)}
                  bg={isActive(folder) ? 'var(--mantine-primary-color-light)' : undefined}
                >
                  <Text size='xs' style={{ paddingLeft: folder.depth * 12 }}>
                    {folder.depth > 0 ? '└ ' : ''}
                    {folder.name}
                  </Text>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <div
        ref={measureRef}
        aria-hidden='true'
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          display: 'flex',
          gap: GAP,
          whiteSpace: 'nowrap',
        }}
      >
        {folderOptions.map((folder) => (
          <Button
            key={`measure-${folder.id}`}
            variant='light'
            size='compact-xs'
            leftSection={folder.id === '' ? undefined : <IconFolder size='0.9rem' />}
            style={{ flexShrink: 0 }}
          >
            <Text size='xs' truncate maw={160}>
              {folder.name}
            </Text>
          </Button>
        ))}
      </div>
    </div>
  );
}
