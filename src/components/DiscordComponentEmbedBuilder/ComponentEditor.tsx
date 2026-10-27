import type { DiscordButton, DiscordComponentEmbedChild, DiscordMedia } from '@/lib/discord';
import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

const newButton = (): DiscordButton => ({ type: 2, url: '{link.returned}', label: 'Open' });

export function newComponent(type: string, context: 'file' | 'url'): DiscordComponentEmbedChild {
  const title =
    context === 'url'
      ? '## [Open shortened link]({link.returned})\n{url.destination}'
      : '## [{file.name}]({link.returned})';
  const mediaUrl = context === 'url' ? 'https://example.com/image.png' : '{link.raw}';
  const description = context === 'url' ? 'Custom image' : '{file.name}';

  switch (Number(type)) {
    case 1:
      return { type: 1, components: [newButton()] };
    case 9:
      return {
        type: 9,
        components: [{ type: 10, content: title }],
        accessory: newButton(),
      };
    case 12:
      return { type: 12, items: [{ url: mediaUrl, description }] };
    case 14:
      return { type: 14, divider: true, spacing: 1 };
    default:
      return { type: 10, content: title };
  }
}

export function IdInput({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  const { t } = useTranslation('settings');
  return (
    <NumberInput
      label={t('componentBuilder.fields.id')}
      description={t('componentBuilder.fields.idDescription')}
      value={value ?? ''}
      min={0}
      max={2_147_483_647}
      allowDecimal={false}
      onChange={(next) => onChange(typeof next === 'number' ? next : undefined)}
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
          label={t('componentBuilder.fields.buttonUrl')}
          value={value.url}
          maxLength={512}
          onChange={(event) => onChange({ ...value, url: event.currentTarget.value })}
        />
        <TextInput
          label={t('componentBuilder.fields.buttonLabel')}
          value={value.label ?? ''}
          maxLength={80}
          onChange={(event) => onChange({ ...value, label: event.currentTarget.value })}
        />
        <TextInput
          label={t('componentBuilder.fields.emojiName')}
          description={t('componentBuilder.fields.emojiNameDescription')}
          value={value.emojiName ?? ''}
          onChange={(event) => onChange({ ...value, emojiName: event.currentTarget.value })}
        />
        <TextInput
          label={t('componentBuilder.fields.emojiId')}
          value={value.emojiId ?? ''}
          onChange={(event) => onChange({ ...value, emojiId: event.currentTarget.value })}
        />
        <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
      </SimpleGrid>
      <Group>
        <Switch
          label={t('componentBuilder.fields.disabled')}
          checked={!!value.disabled}
          onChange={(event) => onChange({ ...value, disabled: event.currentTarget.checked })}
        />
        <Switch
          label={t('componentBuilder.fields.animatedEmoji')}
          checked={!!value.emojiAnimated}
          disabled={!value.emojiId}
          onChange={(event) => onChange({ ...value, emojiAnimated: event.currentTarget.checked })}
        />
      </Group>
    </Stack>
  );
}

function MediaEditor({ value, onChange }: { value: DiscordMedia; onChange: (value: DiscordMedia) => void }) {
  const { t } = useTranslation('settings');
  return (
    <Stack gap='xs'>
      <TextInput
        required
        label={t('componentBuilder.fields.mediaUrl')}
        description={t('componentBuilder.fields.mediaUrlDescription')}
        value={value.url}
        maxLength={2_048}
        onChange={(event) => onChange({ ...value, url: event.currentTarget.value })}
      />
      <TextInput
        label={t('componentBuilder.fields.altText')}
        value={value.description ?? ''}
        maxLength={1_024}
        onChange={(event) => onChange({ ...value, description: event.currentTarget.value })}
      />
      <Switch
        label={t('componentBuilder.fields.spoiler')}
        checked={!!value.spoiler}
        onChange={(event) => onChange({ ...value, spoiler: event.currentTarget.checked })}
      />
    </Stack>
  );
}

export default function ComponentEditor({
  value,
  onChange,
  context,
}: {
  value: DiscordComponentEmbedChild;
  onChange: (value: DiscordComponentEmbedChild) => void;
  context: 'file' | 'url';
}) {
  const { t } = useTranslation('settings');

  if (value.type === 10) {
    return (
      <Stack gap='xs'>
        <Textarea
          required
          autosize
          minRows={3}
          label={t('componentBuilder.fields.markdown')}
          description={t('componentBuilder.fields.markdownDescription')}
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
            label={t('componentBuilder.fields.divider')}
            checked={value.divider !== false}
            onChange={(event) => onChange({ ...value, divider: event.currentTarget.checked })}
          />
          <Select
            label={t('componentBuilder.fields.spacing')}
            data={[
              { value: '1', label: t('componentBuilder.fields.small') },
              { value: '2', label: t('componentBuilder.fields.large') },
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
              <Text fw={600}>{t('componentBuilder.buttonNumber', { number: index + 1 })}</Text>
              <ActionIcon
                color='red'
                variant='subtle'
                aria-label={t('componentBuilder.removeButton')}
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
          {t('componentBuilder.addButton')}
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
              <Text fw={600}>{t('componentBuilder.mediaNumber', { number: index + 1 })}</Text>
              <ActionIcon
                color='red'
                variant='subtle'
                aria-label={t('componentBuilder.removeMedia')}
                disabled={value.items.length === 1}
                onClick={() =>
                  onChange({ ...value, items: value.items.filter((_, itemIndex) => itemIndex !== index) })
                }
              >
                <IconTrash size='1rem' />
              </ActionIcon>
            </Group>
            <MediaEditor
              value={item}
              onChange={(next) =>
                onChange({
                  ...value,
                  items: value.items.map((entry, itemIndex) => (itemIndex === index ? next : entry)),
                })
              }
            />
          </Paper>
        ))}
        <Button
          variant='light'
          leftSection={<IconPlus size='1rem' />}
          disabled={value.items.length >= 10}
          onClick={() =>
            onChange({
              ...value,
              items: [
                ...value.items,
                { url: context === 'url' ? 'https://example.com/image.png' : '{link.raw}' },
              ],
            })
          }
        >
          {t('componentBuilder.addMedia')}
        </Button>
        <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
      </Stack>
    );
  }

  const accessory = value.accessory;
  return (
    <Stack gap='sm'>
      {value.components.map((text, index) => (
        <Paper withBorder p='xs' key={index}>
          <Group justify='space-between' mb='xs'>
            <Text fw={600}>{t('componentBuilder.textNumber', { number: index + 1 })}</Text>
            <ActionIcon
              color='red'
              variant='subtle'
              aria-label={t('componentBuilder.removeText')}
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
            label={t('componentBuilder.fields.markdown')}
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
        {t('componentBuilder.addText')}
      </Button>
      <Select
        label={t('componentBuilder.fields.accessory')}
        data={[
          { value: '2', label: t('componentBuilder.fields.linkButton') },
          { value: '11', label: t('componentBuilder.fields.thumbnail') },
        ]}
        value={String(accessory.type)}
        onChange={(type) =>
          onChange({
            ...value,
            accessory:
              type === '11'
                ? {
                    type: 11,
                    url: context === 'url' ? 'https://example.com/image.png' : '{link.raw}',
                    description: context === 'url' ? 'Custom image' : '{file.name}',
                  }
                : newButton(),
          })
        }
      />
      {accessory.type === 2 ? (
        <ButtonEditor value={accessory} onChange={(accessory) => onChange({ ...value, accessory })} />
      ) : (
        <Stack gap='xs'>
          <MediaEditor
            value={accessory}
            onChange={(media) => onChange({ ...value, accessory: { ...accessory, ...media } })}
          />
          <IdInput
            value={accessory.id}
            onChange={(id) => onChange({ ...value, accessory: { ...accessory, id } })}
          />
        </Stack>
      )}
      <IdInput value={value.id} onChange={(id) => onChange({ ...value, id })} />
    </Stack>
  );
}
