import type { DiscordComponentEmbed, DiscordComponentEmbedChild } from '@/lib/discord';
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
import {
  ActionIcon,
  Alert,
  Button,
  ColorInput,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconGripVertical, IconInfoCircle, IconPlus, IconSettings, IconTrash } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ComponentEditor, { IdInput, newComponent } from './ComponentEditor';

type Props = {
  value: DiscordComponentEmbed;
  disabled?: boolean;
  onChange: (value: DiscordComponentEmbed) => void;
  context?: 'file' | 'url';
  showEnabledToggle?: boolean;
};

function SortableComponent({
  sortId,
  value,
  canRemove,
  onChange,
  onRemove,
  context,
}: {
  sortId: string;
  value: DiscordComponentEmbedChild;
  canRemove: boolean;
  onChange: (value: DiscordComponentEmbedChild) => void;
  onRemove: () => void;
  context: 'file' | 'url';
}) {
  const { t } = useTranslation('settings');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortId,
  });

  const label = t(`componentBuilder.types.${value.type}`);

  return (
    <Paper
      withBorder
      p='sm'
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <Group justify='space-between' mb='sm'>
        <Group gap='xs'>
          <ActionIcon
            variant='subtle'
            style={{ cursor: 'grab', touchAction: 'none' }}
            aria-label={t('componentBuilder.reorder', { type: label })}
            {...attributes}
            {...listeners}
          >
            <IconGripVertical size='1rem' />
          </ActionIcon>
          <Text fw={700}>{label}</Text>
        </Group>
        <Tooltip label={t('componentBuilder.removeComponent')}>
          <ActionIcon
            color='red'
            variant='subtle'
            aria-label={t('componentBuilder.removeComponent')}
            disabled={!canRemove}
            onClick={onRemove}
          >
            <IconTrash size='1rem' />
          </ActionIcon>
        </Tooltip>
      </Group>
      <ComponentEditor value={value} onChange={onChange} context={context} />
    </Paper>
  );
}

export default function DiscordComponentEmbedBuilder({
  value,
  disabled = false,
  onChange,
  context = 'file',
  showEnabledToggle = true,
}: Props) {
  const { t } = useTranslation(['settings', 'common']);
  const [componentType, setComponentType] = useState<string | null>('10');
  const [opened, setOpened] = useState(false);
  const nextComponentKey = useRef(value.components.length);
  const [componentKeys, setComponentKeys] = useState(() =>
    value.components.map((_, index) => `component-${index}`),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateComponent = (index: number, component: DiscordComponentEmbedChild) => {
    onChange({
      ...value,
      components: value.components.map((entry, itemIndex) => (itemIndex === index ? component : entry)),
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const from = componentKeys.indexOf(String(active.id));
    const to = componentKeys.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    setComponentKeys(arrayMove(componentKeys, from, to));
    onChange({ ...value, components: arrayMove(value.components, from, to) });
  };

  const removeComponent = (index: number) => {
    setComponentKeys(componentKeys.filter((_, itemIndex) => itemIndex !== index));
    onChange({
      ...value,
      components: value.components.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const addComponent = () => {
    if (!componentType || value.components.length >= 39) return;

    setComponentKeys([...componentKeys, `component-${nextComponentKey.current++}`]);
    onChange({ ...value, components: [...value.components, newComponent(componentType, context)] });
  };

  return (
    <Stack gap='sm'>
      {showEnabledToggle ? (
        <Switch
          label={t('componentBuilder.label')}
          description={t('componentBuilder.description')}
          disabled={disabled}
          checked={value.enabled}
          onChange={(event) => onChange({ ...value, enabled: event.currentTarget.checked })}
        />
      ) : null}

      {(value.enabled || !showEnabledToggle) && !disabled ? (
        <>
          <Group justify='space-between'>
            <Text size='sm' c='dimmed'>
              {t('componentBuilder.componentCount', { count: value.components.length })}
            </Text>
            <Button
              leftSection={<IconSettings size='1rem' />}
              onClick={() => {
                setComponentKeys(value.components.map((_, index) => `component-${index}`));
                nextComponentKey.current = value.components.length;
                setOpened(true);
              }}
            >
              {t('componentBuilder.configure')}
            </Button>
          </Group>

          <Modal
            opened={opened}
            onClose={() => setOpened(false)}
            title={t('componentBuilder.modalTitle')}
            size='xl'
            centered
            scrollAreaComponent={ScrollArea.Autosize}
          >
            <Stack gap='sm'>
              <Alert icon={<IconInfoCircle size='1rem' />}>{t('componentBuilder.limits')}</Alert>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing='sm'>
                <ColorInput
                  label={t('componentBuilder.fields.accentColor')}
                  value={value.accentColor ?? ''}
                  onChange={(accentColor) => onChange({ ...value, accentColor })}
                />
                <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
              </SimpleGrid>
              <Switch
                label={t('componentBuilder.fields.containerSpoiler')}
                checked={!!value.spoiler}
                onChange={(event) => onChange({ ...value, spoiler: event.currentTarget.checked })}
              />

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={componentKeys} strategy={verticalListSortingStrategy}>
                  <Stack gap='sm'>
                    {value.components.map((component, index) => (
                      <SortableComponent
                        key={componentKeys[index]}
                        sortId={componentKeys[index]}
                        value={component}
                        canRemove={value.components.length > 1}
                        onChange={(next) => updateComponent(index, next)}
                        onRemove={() => removeComponent(index)}
                        context={context}
                      />
                    ))}
                  </Stack>
                </SortableContext>
              </DndContext>

              <Group align='end'>
                <Select
                  label={t('componentBuilder.addComponent')}
                  data={([10, 9, 12, 14, 1] as const).map((type) => ({
                    value: String(type),
                    label: t(`componentBuilder.types.${type}`),
                  }))}
                  value={componentType}
                  onChange={setComponentType}
                />
                <Button
                  leftSection={<IconPlus size='1rem' />}
                  disabled={!componentType || value.components.length >= 39}
                  onClick={addComponent}
                >
                  {t('componentBuilder.add')}
                </Button>
              </Group>
              <Group justify='flex-end'>
                <Button variant='default' onClick={() => setOpened(false)}>
                  {t('common:actions.close')}
                </Button>
              </Group>
            </Stack>
          </Modal>
        </>
      ) : null}
    </Stack>
  );
}
