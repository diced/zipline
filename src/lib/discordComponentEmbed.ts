import { parseString, type ParseValue } from '@/lib/parser';
import { z } from 'zod';

const componentIdSchema = z.number().int().min(0).max(2_147_483_647).optional();

export const discordButtonSchema = z
  .object({
    type: z.literal(2),
    id: componentIdSchema,
    url: z.string().max(512),
    label: z.string().max(80).optional(),
    emojiName: z.string().optional(),
    emojiId: z.string().optional(),
    emojiAnimated: z.boolean().optional(),
    disabled: z.boolean().optional(),
  })
  .strict();

const textDisplaySchema = z
  .object({
    type: z.literal(10),
    id: componentIdSchema,
    content: z.string(),
  })
  .strict();

const thumbnailSchema = z
  .object({
    type: z.literal(11),
    id: componentIdSchema,
    url: z.string().max(2_048),
    description: z.string().max(1_024).optional(),
    spoiler: z.boolean().optional(),
  })
  .strict();

const sectionSchema = z
  .object({
    type: z.literal(9),
    id: componentIdSchema,
    components: z.array(textDisplaySchema).min(1).max(3),
    accessory: z.discriminatedUnion('type', [discordButtonSchema, thumbnailSchema]),
  })
  .strict();

const mediaGalleryItemSchema = z
  .object({
    url: z.string().max(2_048),
    description: z.string().max(1_024).optional(),
    spoiler: z.boolean().optional(),
  })
  .strict();

const mediaGallerySchema = z
  .object({
    type: z.literal(12),
    id: componentIdSchema,
    items: z.array(mediaGalleryItemSchema).min(1).max(10),
  })
  .strict();

const separatorSchema = z
  .object({
    type: z.literal(14),
    id: componentIdSchema,
    divider: z.boolean().optional(),
    spacing: z.union([z.literal(1), z.literal(2)]).optional(),
  })
  .strict();

const actionRowSchema = z
  .object({
    type: z.literal(1),
    id: componentIdSchema,
    components: z.array(discordButtonSchema).min(1).max(5),
  })
  .strict();

export const discordComponentEmbedChildSchema = z.discriminatedUnion('type', [
  actionRowSchema,
  sectionSchema,
  textDisplaySchema,
  mediaGallerySchema,
  separatorSchema,
]);

export const discordComponentEmbedSchema = z
  .object({
    enabled: z.boolean(),
    id: componentIdSchema,
    accentColor: z.string().max(7).optional(),
    spoiler: z.boolean().optional(),
    components: z.array(discordComponentEmbedChildSchema).min(1).max(39),
  })
  .strict();

export type DiscordButton = z.infer<typeof discordButtonSchema>;
export type DiscordComponentEmbedChild = z.infer<typeof discordComponentEmbedChildSchema>;
export type DiscordComponentEmbed = z.infer<typeof discordComponentEmbedSchema>;

type BuiltButton = {
  type: 2;
  id?: number;
  style: 5;
  url: string;
  label?: string;
  emoji?: { name?: string; id?: string; animated?: boolean };
  disabled?: boolean;
};

type BuiltChild =
  | { type: 1; id?: number; components: BuiltButton[] }
  | {
      type: 9;
      id?: number;
      components: { type: 10; id?: number; content: string }[];
      accessory:
        | BuiltButton
        | { type: 11; id?: number; media: { url: string }; description?: string; spoiler?: boolean };
    }
  | { type: 10; id?: number; content: string }
  | {
      type: 12;
      id?: number;
      items: { media: { url: string }; description?: string; spoiler?: boolean }[];
    }
  | { type: 14; id?: number; divider?: false; spacing?: 2 };

export const defaultDiscordComponentEmbed = (): DiscordComponentEmbed => ({
  enabled: false,
  accentColor: '',
  spoiler: false,
  components: [
    {
      type: 10,
      content: '## [{file.name}]({link.returned})\n{file.type} • {file.size::bytes}',
    },
  ],
});

const parsed = (value: string | undefined, parseValue: ParseValue) =>
  value ? (parseString(value, parseValue) ?? '') : '';

function buildButton(button: DiscordButton, parseValue: ParseValue): BuiltButton {
  const label = parsed(button.label, parseValue);
  const emojiName = parsed(button.emojiName, parseValue);
  const emojiId = parsed(button.emojiId, parseValue);
  const emoji =
    emojiName || emojiId
      ? {
          ...(emojiName && { name: emojiName }),
          ...(emojiId && { id: emojiId }),
          ...(button.emojiAnimated && { animated: true }),
        }
      : undefined;

  return {
    type: 2,
    ...(button.id !== undefined && { id: button.id }),
    style: 5,
    url: parsed(button.url, parseValue),
    ...(label && { label }),
    ...(emoji && { emoji }),
    ...(button.disabled && { disabled: true }),
  };
}

function buildChild(component: DiscordComponentEmbedChild, parseValue: ParseValue): BuiltChild {
  const id = component.id !== undefined ? { id: component.id } : {};

  switch (component.type) {
    case 1:
      return {
        type: 1,
        ...id,
        components: component.components.map((button) => buildButton(button, parseValue)),
      };
    case 9:
      const description = parsed(
        component.accessory.type === 11 ? component.accessory.description : undefined,
        parseValue,
      );
      return {
        type: 9,
        ...id,
        components: component.components.map((text) => ({
          type: 10,
          ...(text.id !== undefined && { id: text.id }),
          content: parsed(text.content, parseValue),
        })),
        accessory:
          component.accessory.type === 2
            ? buildButton(component.accessory, parseValue)
            : {
                type: 11,
                ...(component.accessory.id !== undefined && { id: component.accessory.id }),
                media: { url: parsed(component.accessory.url, parseValue) },
                ...(description && { description }),
                ...(component.accessory.spoiler && { spoiler: true }),
              },
      };
    case 10:
      return { type: 10, ...id, content: parsed(component.content, parseValue) };
    case 12:
      return {
        type: 12,
        ...id,
        items: component.items.map((item) => {
          const description = parsed(item.description, parseValue);
          return {
            media: { url: parsed(item.url, parseValue) },
            ...(description && { description }),
            ...(item.spoiler && { spoiler: true }),
          };
        }),
      };
    case 14:
      return {
        type: 14,
        ...id,
        ...(component.divider === false && { divider: false }),
        ...(component.spacing === 2 && { spacing: 2 }),
      };
  }
}

function componentCount(config: DiscordComponentEmbed) {
  return (
    1 +
    config.components.reduce((total, component) => {
      if (component.type === 1) return total + 1 + component.components.length;
      if (component.type === 9) return total + 2 + component.components.length;
      return total + 1;
    }, 0)
  );
}

function hasUniqueIds(config: DiscordComponentEmbed) {
  const used = new Set<number>();
  const add = (id?: number) => {
    if (!id) return true;
    if (used.has(id)) return false;
    used.add(id);
    return true;
  };

  if (!add(config.id)) return false;
  for (const component of config.components) {
    if (!add(component.id)) return false;
    if (component.type === 1 && component.components.some((button) => !add(button.id))) return false;
    if (
      component.type === 9 &&
      (component.components.some((text) => !add(text.id)) || !add(component.accessory.id))
    ) {
      return false;
    }
  }
  return true;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidBuiltPayload(payload: BuiltChild[]) {
  let galleryItems = 0;

  for (const component of payload) {
    if (component.type === 10 && !component.content) return false;
    if (component.type === 12) {
      galleryItems += component.items.length;
      if (component.items.some((item) => !isHttpUrl(item.media.url))) return false;
    }
    if (
      component.type === 1 &&
      component.components.some((button) => !button.url || (!button.label && !button.emoji))
    ) {
      return false;
    }
    if (component.type === 9) {
      if (component.components.some((text) => !text.content)) return false;
      const accessory = component.accessory;
      if (accessory.type === 2 && (!accessory.url || (!accessory.label && !accessory.emoji))) return false;
      if (accessory.type === 11 && !isHttpUrl(accessory.media.url)) return false;
    }
  }

  return galleryItems <= 10;
}

export function serializeDiscordComponentEmbed(config: unknown, parseValue: ParseValue) {
  const result = discordComponentEmbedSchema.safeParse(config);
  if (
    !result.success ||
    !result.data.enabled ||
    componentCount(result.data) > 40 ||
    !hasUniqueIds(result.data)
  ) {
    return null;
  }

  const components = result.data.components.map((component) => buildChild(component, parseValue));
  if (!isValidBuiltPayload(components)) return null;

  const accentColor = result.data.accentColor?.replace(/^#/, '');
  const accent =
    accentColor && /^[0-9a-f]{6}$/i.test(accentColor) ? Number.parseInt(accentColor, 16) : undefined;
  const payload = {
    component: {
      type: 17,
      ...(result.data.id !== undefined && { id: result.data.id }),
      ...(accent !== undefined && { accent_color: accent }),
      ...(result.data.spoiler && { spoiler: true }),
      components,
    },
  };

  const json = JSON.stringify(payload)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');

  return new TextEncoder().encode(json).byteLength <= 3_000 ? json : null;
}
