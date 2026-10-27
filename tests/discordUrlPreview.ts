import { createComponentPreviewHtml, createNoPreviewHtml, isDiscordCrawler } from '@/lib/discord';
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('identifies Discord preview crawlers without matching normal browsers', () => {
  assert.equal(isDiscordCrawler('Discordbot/2.0; +https://discordapp.com'), true);
  assert.equal(isDiscordCrawler('Discord-Embedded-App-SDK/1.0'), true);
  assert.equal(isDiscordCrawler('Mozilla/5.0'), false);
  assert.equal(isDiscordCrawler(), false);
});

test('renders a component preview document with escaped fallback metadata', () => {
  const component = '{"component":{"type":17,"components":[]}}';
  const html = createComponentPreviewHtml(
    'https://zipline.test/go/demo?x="unsafe"',
    'https://example.com/?q="><script>alert(1)</script>',
    component,
  );

  assert.match(html, /id="discord:component-embed"/);
  assert.match(html, /\{"component":\{"type":17/);
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.match(html, /&#x3C;script&#x3E;alert\(1\)&#x3C;\/script&#x3E;/);
});

test('renders a metadata-free document when previews are disabled', () => {
  const html = createNoPreviewHtml();
  assert.equal(html.includes('og:'), false);
  assert.equal(html.includes('discord:component-embed'), false);
  assert.match(html, /noindex,nofollow,noarchive/);
});
