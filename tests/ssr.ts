import assert from 'assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'vm';
import { createZiplineSsr } from '@/lib/ssr/createZiplineSsr';
import { ZIPLINE_SSR_PROP } from '@/lib/ssr/constants';

test('SSR serialization escapes closing script tags and preserves dangerous text as data', () => {
  const value = '</script><script>window.injected=true</script><!-- & \u2028\u2029 résumé';
  const html = createZiplineSsr({ value });

  assert.equal((html.match(/<\/script>/gi) ?? []).length, 1);

  const context = { window: {} as Record<string, unknown> };
  runInNewContext(html.slice('<script>'.length, -'</script>'.length), context, { timeout: 1000 });

  assert.equal((context.window[ZIPLINE_SSR_PROP] as { value: string }).value, value);
  assert.equal(context.window.injected, undefined);
});

test('SSR serialization preserves nested arrays, dates, Unicode, and null values', () => {
  const input = {
    nested: [1, null, { text: '你好', date: new Date('2026-01-01T00:00:00Z') }],
    enabled: false,
  };
  const html = createZiplineSsr(input);
  const context = { window: {} as Record<string, unknown> };

  runInNewContext(html.slice(8, -9), context, { timeout: 1000 });
  const output = context.window[ZIPLINE_SSR_PROP] as typeof input;

  assert.equal(JSON.stringify(output), JSON.stringify(input));
  assert.equal(Object.prototype.toString.call((output.nested[2] as { date: Date }).date), '[object Date]');
});
