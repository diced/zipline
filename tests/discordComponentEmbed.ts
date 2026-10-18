import {
  defaultDiscordComponentEmbed,
  serializeDiscordComponentEmbed,
  type DiscordComponentEmbed,
} from '@/lib/discordComponentEmbed';
import type { ParseValue } from '@/lib/parser';
import assert from 'assert/strict';
import { test } from 'node:test';

const values = {
  file: { name: 'photo.png', size: 2_048, type: 'image/png' },
  user: { username: 'Zipline' },
  link: {
    returned: 'https://zipline.local/view/photo.png',
    raw: 'https://zipline.local/u/photo.png',
  },
} as unknown as ParseValue;

test('serializes every component supported by Discord website embeds', () => {
  const config: DiscordComponentEmbed = {
    enabled: true,
    id: 1,
    accentColor: '#5865f2',
    spoiler: true,
    components: [
      { type: 10, content: '# {file.name}' },
      {
        type: 9,
        components: [{ type: 10, content: '{file.type}' }],
        accessory: {
          type: 11,
          url: '{link.raw}',
          description: '{file.name}',
          spoiler: true,
        },
      },
      {
        type: 12,
        items: [{ url: '{link.raw}', description: 'A preview', spoiler: true }],
      },
      { type: 14, divider: false, spacing: 2 },
      {
        type: 1,
        components: [
          {
            type: 2,
            url: '{link.returned}',
            label: 'Open',
            emojiName: '🔗',
            disabled: true,
          },
        ],
      },
    ],
  };

  const json = serializeDiscordComponentEmbed(config, values);
  assert.ok(json);
  assert.deepEqual(JSON.parse(json), {
    component: {
      type: 17,
      id: 1,
      accent_color: 5_793_266,
      spoiler: true,
      components: [
        { type: 10, content: '# photo.png' },
        {
          type: 9,
          components: [{ type: 10, content: 'image/png' }],
          accessory: {
            type: 11,
            media: { url: 'https://zipline.local/u/photo.png' },
            description: 'photo.png',
            spoiler: true,
          },
        },
        {
          type: 12,
          items: [
            {
              media: { url: 'https://zipline.local/u/photo.png' },
              description: 'A preview',
              spoiler: true,
            },
          ],
        },
        { type: 14, divider: false, spacing: 2 },
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              url: 'https://zipline.local/view/photo.png',
              label: 'Open',
              emoji: { name: '🔗' },
              disabled: true,
            },
          ],
        },
      ],
    },
  });
});

test('does not emit disabled, invalid, or oversized payloads', () => {
  assert.equal(serializeDiscordComponentEmbed(defaultDiscordComponentEmbed(), values), null);

  const invalid = defaultDiscordComponentEmbed();
  invalid.enabled = true;
  invalid.components[0] = { type: 10, content: '' };
  assert.equal(serializeDiscordComponentEmbed(invalid, values), null);

  const oversized = defaultDiscordComponentEmbed();
  oversized.enabled = true;
  oversized.components[0] = { type: 10, content: 'x'.repeat(3_001) };
  assert.equal(serializeDiscordComponentEmbed(oversized, values), null);

  const invalidMedia = defaultDiscordComponentEmbed();
  invalidMedia.enabled = true;
  invalidMedia.components = [{ type: 12, items: [{ url: 'javascript:alert(1)' }] }];
  assert.equal(serializeDiscordComponentEmbed(invalidMedia, values), null);

  const duplicateIds = defaultDiscordComponentEmbed();
  duplicateIds.enabled = true;
  duplicateIds.id = 1;
  duplicateIds.components[0].id = 1;
  assert.equal(serializeDiscordComponentEmbed(duplicateIds, values), null);
});

test('escapes strings that could terminate the inline script', () => {
  const config = defaultDiscordComponentEmbed();
  config.enabled = true;
  config.components[0] = { type: 10, content: '</script><script>alert(1)</script>' };

  const json = serializeDiscordComponentEmbed(config, values);
  assert.ok(json);
  assert.equal(json.includes('</script>'), false);
  assert.equal(JSON.parse(json).component.components[0].content, '</script><script>alert(1)</script>');
});
