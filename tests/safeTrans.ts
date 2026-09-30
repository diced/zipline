import assert from 'assert/strict';
import { test } from 'node:test';
import React, { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// tsx compiles .tsx with the classic runtime (tsconfig keeps jsx as "preserve" for vite), which needs a global React
(globalThis as any).React = React;
const { default: SafeTrans } = await import('@/components/SafeTrans');

// untyped: the test namespace is not part of the app's CustomTypeOptions
const i18n: any = i18next.createInstance();
await i18n.use(initReactI18next).init({
  lng: 'en',
  // mirrors src/lib/i18n: plain t() is left unescaped because React escapes its output
  interpolation: { escapeValue: false },
  resources: {
    en: {
      test: {
        greeting: 'Hi <b>{{name}}</b>, see <anchor>the docs</anchor>',
        plain: 'Hi {{name}}',
        imported_one: '<b>{{count}}</b> file by {{name}}<br/>done',
        imported_other: '<b>{{count}}</b> files by {{name}}<br/>done',
      },
    },
  },
});

const render = (values: Record<string, string>) =>
  renderToStaticMarkup(
    h(SafeTrans as any, {
      i18n,
      ns: 'test',
      i18nKey: 'greeting',
      values,
      components: { b: h('b'), anchor: h('a', { href: '/docs' }) },
    }),
  );

test('SafeTrans renders the mapped components with their text inside', () => {
  assert.equal(render({ name: 'Ann' }), 'Hi <b>Ann</b>, see <a href="/docs">the docs</a>');
});

test('SafeTrans keeps markup in interpolated values as literal text', () => {
  const html = render({ name: '<anchor>evil</anchor><b>x</b><script>alert(1)</script>' });

  assert.equal(
    html,
    'Hi <b>&lt;anchor&gt;evil&lt;/anchor&gt;&lt;b&gt;x&lt;/b&gt;&lt;script&gt;alert(1)&lt;/script&gt;</b>, see <a href="/docs">the docs</a>',
  );
});

test('SafeTrans shows special characters in values exactly once escaped', () => {
  assert.equal(
    render({ name: `Tom & Jerry's "/" \`x\` =` }),
    `Hi <b>Tom &amp; Jerry&#x27;s &quot;/&quot; \`x\` =</b>, see <a href="/docs">the docs</a>`,
  );
});

test('plain t() stays unescaped so React escapes it exactly once', () => {
  const html = renderToStaticMarkup(h('span', null, i18n.t('test:plain', { name: 'Tom & <b>' })));

  assert.equal(html, '<span>Hi Tom &amp; &lt;b&gt;</span>');
});

test('SafeTrans resolves plurals from values.count with a t prop and keeps <br/>', () => {
  const t = i18n.getFixedT('en', 'test');
  const render = (count: number) =>
    renderToStaticMarkup(
      h(SafeTrans as any, {
        t,
        i18nKey: 'imported',
        values: { count, name: 'A & <b>B</b>' },
        components: { b: h('b'), br: h('br') },
      }),
    );

  assert.equal(render(1), '<b>1</b> file by A &amp; &lt;b&gt;B&lt;/b&gt;<br/>done');
  assert.equal(render(3), '<b>3</b> files by A &amp; &lt;b&gt;B&lt;/b&gt;<br/>done');
});

test('SafeTrans resolves plurals from the count prop', () => {
  const html = renderToStaticMarkup(
    h(SafeTrans as any, {
      t: i18n.getFixedT('en', 'test'),
      i18nKey: 'imported',
      count: 3,
      values: { name: '<b>B</b>' },
      components: { b: h('b'), br: h('br') },
    }),
  );

  assert.equal(html, '<b>3</b> files by &lt;b&gt;B&lt;/b&gt;<br/>done');
});
