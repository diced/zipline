import assert from 'node:assert/strict';
import test from 'node:test';
import hljs from 'highlight.js';
import { highlightLines } from './highlightLines';

test('HTML characters are escaped once when rendering plain text', () => {
  const code = 'if (a < b && c > d)';
  const expected = 'if (a &lt; b &amp;&amp; c &gt; d)';

  assert.equal(highlightLines(code, 'plaintext', null)[0], expected);
  assert.equal(highlightLines(code, 'plaintext', hljs)[0], expected);
});
