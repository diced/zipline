import type { HLJSApi } from 'highlight.js';
import * as sanitize from 'isomorphic-dompurify';

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function highlightLines(code: string, language: string, hljs: HLJSApi | null) {
  const lines = code.split('\n');

  if (!hljs) return lines.map(escapeHtml);

  return lines.map((line) =>
    sanitize.sanitize(hljs.highlight(line || ' ', { language }).value, {
      USE_PROFILES: { html: true },
    }),
  );
}
