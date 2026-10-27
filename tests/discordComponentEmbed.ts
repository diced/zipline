import {
  defaultDiscordComponentEmbed,
  defaultDiscordUrlComponentEmbed,
  prepareDiscordComponentEmbedForFile,
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

test('serializes the shortened URL preset with URL variables', () => {
  const config = defaultDiscordUrlComponentEmbed();
  config.components.push({
    type: 12,
    items: [{ url: 'https://cdn.example.com/custom.png', description: 'Custom preview' }],
  });

  const json = serializeDiscordComponentEmbed(config, {
    url: { destination: 'https://example.com/article' },
    link: {
      returned: 'https://zipline.local/go/demo',
      raw: 'https://example.com/article',
    },
  });

  assert.ok(json);
  const payload = JSON.parse(json);
  assert.equal(
    payload.component.components[0].content,
    '## [Open shortened link](https://zipline.local/go/demo)\nhttps://example.com/article',
  );
  assert.equal(payload.component.components[1].items[0].media.url, 'https://cdn.example.com/custom.png');
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

  const invalidButton = defaultDiscordComponentEmbed();
  invalidButton.enabled = true;
  invalidButton.components = [
    { type: 1, components: [{ type: 2, url: 'javascript:alert(1)', label: 'Open' }] },
  ];
  assert.equal(serializeDiscordComponentEmbed(invalidButton, values), null);

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

test('removes raw-file media from non-visual uploads but keeps custom images', () => {
  const config = defaultDiscordComponentEmbed();
  config.enabled = true;
  config.components = [
    {
      type: 9,
      components: [{ type: 10, content: '{file.name}' }],
      accessory: { type: 11, url: '{link.raw}', description: 'Preview' },
    },
    {
      type: 12,
      items: [
        { url: '{link.raw}', description: 'Uploaded file' },
        { url: 'https://cdn.example.com/custom.png', description: 'Custom image' },
      ],
    },
  ];

  const prepared = prepareDiscordComponentEmbedForFile(config, 'text/plain');
  assert.ok(prepared);
  assert.equal(prepared.components[0].type, 9);
  if (prepared.components[0].type === 9) {
    assert.deepEqual(prepared.components[0].accessory, {
      type: 2,
      url: '{link.returned}',
      label: 'Open file',
    });
  }
  assert.equal(prepared.components[1].type, 12);
  if (prepared.components[1].type === 12) {
    assert.deepEqual(prepared.components[1].items, [
      { url: 'https://cdn.example.com/custom.png', description: 'Custom image' },
    ]);
  }
});

test('keeps raw-file media for images and video uploads', () => {
  const config = defaultDiscordComponentEmbed();
  config.enabled = true;
  config.components = [{ type: 12, items: [{ url: '{link.raw}' }] }];

  assert.equal(prepareDiscordComponentEmbedForFile(config, 'image/png'), config);
  assert.equal(prepareDiscordComponentEmbedForFile(config, 'video/mp4'), config);
});
