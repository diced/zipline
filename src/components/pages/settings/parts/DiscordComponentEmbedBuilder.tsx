import {
  ActionIcon,
  Alert,
  Button,
  ColorInput,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
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
import { IconGripVertical, IconInfoCircle, IconPlus, IconSettings, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import type {
  DiscordButton,
  DiscordComponentEmbed,
  DiscordComponentEmbedChild,
} from '@/lib/discordComponentEmbed';

type Props = {
  value: DiscordComponentEmbed;
  disabled: boolean;
  onChange: (value: DiscordComponentEmbed) => void;
};

const componentLabels: Record<DiscordComponentEmbedChild['type'], string> = {
  1: 'Action Row',
  9: 'Section',
  10: 'Text Display',
  12: 'Media Gallery',
  14: 'Separator',
};

const newButton = (): DiscordButton => ({ type: 2, url: '{link.returned}', label: 'Open' });

function newComponent(type: string): DiscordComponentEmbedChild {
  switch (Number(type)) {
    case 1:
      return { type: 1, components: [newButton()] };
    case 9:
      return {
        type: 9,
        components: [{ type: 10, content: '## [{file.name}]({link.returned})' }],
        accessory: newButton(),
      };
    case 12:
      return { type: 12, items: [{ url: '{link.raw}', description: '{file.name}' }] };
    case 14:
      return { type: 14, divider: true, spacing: 1 };
    default:
      return { type: 10, content: '## [{file.name}]({link.returned})' };
  }
}

function optionalId(value: string | number) {
  return typeof value === 'number' ? value : undefined;
}

function IdInput({ value, onChange }: { value?: number; onChange: (value: number | undefined) => void }) {
  const { t } = useTranslation('settings');
  return (
    <NumberInput
      label={t('fileView.componentEmbed.fields.id')}
      description={t('fileView.componentEmbed.fields.idDescription')}
      value={value ?? ''}
      min={0}
      max={2_147_483_647}
      allowDecimal={false}
      onChange={(next) => onChange(optionalId(next))}
    />
  );
}

function ButtonEditor({
  value,
  onChange,
}: {
  value: DiscordButton;
  onChange: (value: DiscordButton) => void;
}) {
  const { t } = useTranslation('settings');
  return (
    <Stack gap='xs'>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing='xs'>
        <TextInput
          required
          label={t('fileView.componentEmbed.fields.buttonUrl')}
          value={value.url}
          onChange={(event) => onChange({ ...value, url: event.currentTarget.value })}
        />
        <TextInput
          label={t('fileView.componentEmbed.fields.buttonLabel')}
          value={value.label ?? ''}
          maxLength={80}
          onChange={(event) => onChange({ ...value, label: event.currentTarget.value })}
        />
        <TextInput
          label={t('fileView.componentEmbed.fields.emojiName')}
          description={t('fileView.componentEmbed.fields.emojiNameDescription')}
          value={value.emojiName ?? ''}
          onChange={(event) => onChange({ ...value, emojiName: event.currentTarget.value })}
        />
        <TextInput
          label={t('fileView.componentEmbed.fields.emojiId')}
          value={value.emojiId ?? ''}
          onChange={(event) => onChange({ ...value, emojiId: event.currentTarget.value })}
        />
        <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
      </SimpleGrid>
      <Group>
        <Switch
          label={t('fileView.componentEmbed.fields.disabled')}
          checked={!!value.disabled}
          onChange={(event) => onChange({ ...value, disabled: event.currentTarget.checked })}
        />
        <Switch
          label={t('fileView.componentEmbed.fields.animatedEmoji')}
          checked={!!value.emojiAnimated}
          disabled={!value.emojiId}
          onChange={(event) => onChange({ ...value, emojiAnimated: event.currentTarget.checked })}
        />
      </Group>
    </Stack>
  );
}

function ComponentEditor({
  value,
  onChange,
}: {
  value: DiscordComponentEmbedChild;
  onChange: (value: DiscordComponentEmbedChild) => void;
}) {
  const { t } = useTranslation('settings');

  if (value.type === 10) {
    return (
      <Stack gap='xs'>
        <Textarea
          required
          autosize
          minRows={3}
          label={t('fileView.componentEmbed.fields.markdown')}
          description={t('fileView.componentEmbed.fields.markdownDescription')}
          value={value.content}
          onChange={(event) => onChange({ ...value, content: event.currentTarget.value })}
        />
        <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
      </Stack>
    );
  }

  if (value.type === 14) {
    return (
      <Stack gap='xs'>
        <Group>
          <Switch
            label={t('fileView.componentEmbed.fields.divider')}
            checked={value.divider !== false}
            onChange={(event) => onChange({ ...value, divider: event.currentTarget.checked })}
          />
          <Select
            label={t('fileView.componentEmbed.fields.spacing')}
            data={[
              { value: '1', label: t('fileView.componentEmbed.fields.small') },
              { value: '2', label: t('fileView.componentEmbed.fields.large') },
            ]}
            value={String(value.spacing ?? 1)}
            onChange={(spacing) => onChange({ ...value, spacing: spacing === '2' ? 2 : 1 })}
          />
        </Group>
        <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
      </Stack>
    );
  }

  if (value.type === 1) {
    return (
      <Stack gap='sm'>
        {value.components.map((button, index) => (
          <Paper withBorder p='xs' key={index}>
            <Group justify='space-between' mb='xs'>
              <Text fw={600}>{t('fileView.componentEmbed.buttonNumber', { number: index + 1 })}</Text>
              <ActionIcon
                color='red'
                variant='subtle'
                aria-label={t('fileView.componentEmbed.removeButton')}
                disabled={value.components.length === 1}
                onClick={() =>
                  onChange({
                    ...value,
                    components: value.components.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                <IconTrash size='1rem' />
              </ActionIcon>
            </Group>
            <ButtonEditor
              value={button}
              onChange={(next) =>
                onChange({
                  ...value,
                  components: value.components.map((item, itemIndex) => (itemIndex === index ? next : item)),
                })
              }
            />
          </Paper>
        ))}
        <Button
          variant='light'
          leftSection={<IconPlus size='1rem' />}
          disabled={value.components.length >= 5}
          onClick={() => onChange({ ...value, components: [...value.components, newButton()] })}
        >
          {t('fileView.componentEmbed.addButton')}
        </Button>
        <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
      </Stack>
    );
  }

  if (value.type === 12) {
    return (
      <Stack gap='sm'>
        {value.items.map((item, index) => (
          <Paper withBorder p='xs' key={index}>
            <Group justify='space-between' mb='xs'>
              <Text fw={600}>{t('fileView.componentEmbed.mediaNumber', { number: index + 1 })}</Text>
              <ActionIcon
                color='red'
                variant='subtle'
                aria-label={t('fileView.componentEmbed.removeMedia')}
                disabled={value.items.length === 1}
                onClick={() =>
                  onChange({ ...value, items: value.items.filter((_, itemIndex) => itemIndex !== index) })
                }
              >
                <IconTrash size='1rem' />
              </ActionIcon>
            </Group>
            <Stack gap='xs'>
              <TextInput
                required
                label={t('fileView.componentEmbed.fields.mediaUrl')}
                value={item.url}
                onChange={(event) =>
                  onChange({
                    ...value,
                    items: value.items.map((entry, itemIndex) =>
                      itemIndex === index ? { ...entry, url: event.currentTarget.value } : entry,
                    ),
                  })
                }
              />
              <TextInput
                label={t('fileView.componentEmbed.fields.altText')}
                value={item.description ?? ''}
                maxLength={1_024}
                onChange={(event) =>
                  onChange({
                    ...value,
                    items: value.items.map((entry, itemIndex) =>
                      itemIndex === index ? { ...entry, description: event.currentTarget.value } : entry,
                    ),
                  })
                }
              />
              <Switch
                label={t('fileView.componentEmbed.fields.spoiler')}
                checked={!!item.spoiler}
                onChange={(event) =>
                  onChange({
                    ...value,
                    items: value.items.map((entry, itemIndex) =>
                      itemIndex === index ? { ...entry, spoiler: event.currentTarget.checked } : entry,
                    ),
                  })
                }
              />
            </Stack>
          </Paper>
        ))}
        <Button
          variant='light'
          leftSection={<IconPlus size='1rem' />}
          disabled={value.items.length >= 10}
          onClick={() => onChange({ ...value, items: [...value.items, { url: '{link.raw}' }] })}
        >
          {t('fileView.componentEmbed.addMedia')}
        </Button>
        <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
      </Stack>
    );
  }

  const accessoryType = String(value.accessory.type);
  const thumbnail = value.accessory.type === 11 ? value.accessory : undefined;
  return (
    <Stack gap='sm'>
      {value.components.map((text, index) => (
        <Paper withBorder p='xs' key={index}>
          <Group justify='space-between' mb='xs'>
            <Text fw={600}>{t('fileView.componentEmbed.textNumber', { number: index + 1 })}</Text>
            <ActionIcon
              color='red'
              variant='subtle'
              aria-label={t('fileView.componentEmbed.removeText')}
              disabled={value.components.length === 1}
              onClick={() =>
                onChange({
                  ...value,
                  components: value.components.filter((_, itemIndex) => itemIndex !== index),
                })
              }
            >
              <IconTrash size='1rem' />
            </ActionIcon>
          </Group>
          <Textarea
            required
            autosize
            minRows={2}
            label={t('fileView.componentEmbed.fields.markdown')}
            value={text.content}
            onChange={(event) =>
              onChange({
                ...value,
                components: value.components.map((entry, itemIndex) =>
                  itemIndex === index ? { ...entry, content: event.currentTarget.value } : entry,
                ),
              })
            }
          />
          <IdInput
            value={text.id}
            onChange={(id) =>
              onChange({
                ...value,
                components: value.components.map((entry, itemIndex) =>
                  itemIndex === index ? { ...entry, id } : entry,
                ),
              })
            }
          />
        </Paper>
      ))}
      <Button
        variant='light'
        leftSection={<IconPlus size='1rem' />}
        disabled={value.components.length >= 3}
        onClick={() =>
          onChange({ ...value, components: [...value.components, { type: 10, content: 'More text' }] })
        }
      >
        {t('fileView.componentEmbed.addText')}
      </Button>
      <Select
        label={t('fileView.componentEmbed.fields.accessory')}
        data={[
          { value: '2', label: t('fileView.componentEmbed.fields.linkButton') },
          { value: '11', label: t('fileView.componentEmbed.fields.thumbnail') },
        ]}
        value={accessoryType}
        onChange={(type) =>
          onChange({
            ...value,
            accessory:
              type === '11' ? { type: 11, url: '{link.raw}', description: '{file.name}' } : newButton(),
          })
        }
      />
      {value.accessory.type === 2 ? (
        <ButtonEditor value={value.accessory} onChange={(accessory) => onChange({ ...value, accessory })} />
      ) : thumbnail ? (
        <Stack gap='xs'>
          <TextInput
            required
            label={t('fileView.componentEmbed.fields.mediaUrl')}
            value={thumbnail.url}
            onChange={(event) =>
              onChange({ ...value, accessory: { ...thumbnail, url: event.currentTarget.value } })
            }
          />
          <TextInput
            label={t('fileView.componentEmbed.fields.altText')}
            value={thumbnail.description ?? ''}
            maxLength={1_024}
            onChange={(event) =>
              onChange({ ...value, accessory: { ...thumbnail, description: event.currentTarget.value } })
            }
          />
          <Switch
            label={t('fileView.componentEmbed.fields.spoiler')}
            checked={!!thumbnail.spoiler}
            onChange={(event) =>
              onChange({ ...value, accessory: { ...thumbnail, spoiler: event.currentTarget.checked } })
            }
          />
          <IdInput
            value={thumbnail.id}
            onChange={(id) => onChange({ ...value, accessory: { ...thumbnail, id } })}
          />
        </Stack>
      ) : null}
      <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
    </Stack>
  );
}

function SortableComponent({
  sortId,
  value,
  canRemove,
  onChange,
  onRemove,
}: {
  sortId: string;
  value: DiscordComponentEmbedChild;
  canRemove: boolean;
  onChange: (value: DiscordComponentEmbedChild) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('settings');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortId,
  });

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
            aria-label={t('fileView.componentEmbed.reorder', { type: componentLabels[value.type] })}
            {...attributes}
            {...listeners}
          >
            <IconGripVertical size='1rem' />
          </ActionIcon>
          <Text fw={700}>{componentLabels[value.type]}</Text>
        </Group>
        <Tooltip label={t('fileView.componentEmbed.removeComponent')}>
          <ActionIcon
            color='red'
            variant='subtle'
            aria-label={t('fileView.componentEmbed.removeComponent')}
            disabled={!canRemove}
            onClick={onRemove}
          >
            <IconTrash size='1rem' />
          </ActionIcon>
        </Tooltip>
      </Group>
      <ComponentEditor value={value} onChange={onChange} />
    </Paper>
  );
}

export default function DiscordComponentEmbedBuilder({ value, disabled, onChange }: Props) {
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
    onChange({ ...value, components: [...value.components, newComponent(componentType)] });
  };

  return (
    <Stack gap='sm'>
      <Switch
        label={t('fileView.componentEmbed.label')}
        description={t('fileView.componentEmbed.description')}
        disabled={disabled}
        checked={value.enabled}
        onChange={(event) => onChange({ ...value, enabled: event.currentTarget.checked })}
      />

      {value.enabled && !disabled ? (
        <>
          <Group justify='space-between'>
            <Text size='sm' c='dimmed'>
              {t('fileView.componentEmbed.componentCount', { count: value.components.length })}
            </Text>
            <Button
              variant='light'
              leftSection={<IconSettings size='1rem' />}
              onClick={() => setOpened(true)}
            >
              {t('fileView.componentEmbed.configure')}
            </Button>
          </Group>

          <Modal
            opened={opened}
            onClose={() => setOpened(false)}
            title={t('fileView.componentEmbed.modalTitle')}
            size='xl'
            centered
            scrollAreaComponent={ScrollArea.Autosize}
          >
            <Stack gap='sm'>
              <Alert icon={<IconInfoCircle size='1rem' />}>{t('fileView.componentEmbed.limits')}</Alert>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing='sm'>
                <ColorInput
                  label={t('fileView.componentEmbed.fields.accentColor')}
                  value={value.accentColor ?? ''}
                  onChange={(accentColor) => onChange({ ...value, accentColor })}
                />
                <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
              </SimpleGrid>
              <Switch
                label={t('fileView.componentEmbed.fields.containerSpoiler')}
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
                      />
                    ))}
                  </Stack>
                </SortableContext>
              </DndContext>

              <Group align='end'>
                <Select
                  label={t('fileView.componentEmbed.addComponent')}
                  data={[
                    { value: '10', label: componentLabels[10] },
                    { value: '9', label: componentLabels[9] },
                    { value: '12', label: componentLabels[12] },
                    { value: '14', label: componentLabels[14] },
                    { value: '1', label: componentLabels[1] },
                  ]}
                  value={componentType}
                  onChange={setComponentType}
                />
                <Button
                  leftSection={<IconPlus size='1rem' />}
                  disabled={!componentType || value.components.length >= 39}
                  onClick={addComponent}
                >
                  {t('fileView.componentEmbed.add')}
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
