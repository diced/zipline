import { useConfig } from '@/components/ConfigProvider';
import type { Response } from '@/lib/api/response';
import { useUserStore } from '@/lib/client/store/user';
import { fetchApi } from '@/lib/fetchApi';
import { getAvailableQuickLinks, type QuickLinkId } from '@/lib/quickLinks';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Checkbox, Group, Paper, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { IconDeviceFloppy, IconGripVertical } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mutate } from 'swr';
import { useShallow } from 'zustand/shallow';

function SortableQuickLink({
  id,
  checked,
  disabled,
  onChange,
}: {
  id: QuickLinkId;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useTranslation(['settings', 'layout']);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const label = t(`layout:titles.${id}`);

  return (
    <Paper
      withBorder
      px='xs'
      py={6}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        touchAction: 'none',
      }}
      {...attributes}
      {...listeners}
      aria-label={t('quickLinks.reorder', { name: label })}
    >
      <Group gap='xs' wrap='nowrap'>
        <IconGripVertical size='1rem' />
        <Checkbox
          size='sm'
          checked={checked}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(event.currentTarget.checked)}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        />
        <Text size='sm'>{label}</Text>
      </Group>
    </Paper>
  );
}

export default function SettingsQuickLinks() {
  const { t } = useTranslation(['settings', 'layout', 'common']);
  const config = useConfig();

  const [user, setUser] = useUserStore(useShallow((state) => [state.user, state.setUser]));
  const [draft, setDraft] = useState<{ order: QuickLinkId[]; selected: QuickLinkId[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const available = getAvailableQuickLinks(config, user?.role);
  const selected = (draft?.selected ?? user?.quickLinks ?? []).filter((id) =>
    available.some((link) => link.id === id),
  );
  const order = [...new Set([...(draft?.order ?? selected), ...available.map((link) => link.id)])].filter(
    (id) => available.some((link) => link.id === id),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !user || saving) return;

    const from = order.findIndex((id) => id === active.id);
    const to = order.findIndex((id) => id === over.id);

    if (from !== -1 && to !== -1) setDraft({ order: arrayMove(order, from, to), selected });
  };

  const save = async () => {
    if (!user || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      const { data, error } = await fetchApi<Response['/api/user']>('/api/user', 'PATCH', {
        quickLinks: order.filter((id) => selected.includes(id)),
      });

      if (error || !data?.user) throw new Error('Failed to save quick links');
      setUser(data.user);

      await mutate('/api/user', data, { revalidate: false });
      setDraft(null);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>{t('quickLinks.title')}</Title>
      <Text size='sm' c='dimmed' mt={3}>
        {t('quickLinks.description')}
      </Text>
      <Stack gap='xs' mt='sm'>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <ScrollArea.Autosize mah={260} type='auto' offsetScrollbars>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <Stack gap={4}>
                {order.map((id) => (
                  <SortableQuickLink
                    key={id}
                    id={id}
                    checked={selected.includes(id)}
                    disabled={!user || saving}
                    onChange={(checked) =>
                      setDraft({
                        order,
                        selected: checked ? [...selected, id] : selected.filter((item) => item !== id),
                      })
                    }
                  />
                ))}
              </Stack>
            </SortableContext>
          </ScrollArea.Autosize>
        </DndContext>

        {saveError && (
          <Text size='sm' c='red'>
            {t('quickLinks.saveError')}
          </Text>
        )}

        <Group justify='left' mt='sm'>
          <Button
            leftSection={<IconDeviceFloppy size='1rem' />}
            disabled={!user || draft === null}
            loading={saving}
            onClick={save}
          >
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
