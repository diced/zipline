import { Paper, Typography } from '@mantine/core';
import { Marked, Renderer } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'isomorphic-dompurify';

const renderer = new Renderer();

renderer.code = function ({ text, lang }) {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  let highlighted: string;
  try {
    highlighted = hljs.highlight(text, { language }).value;
  } catch {
    highlighted = text;
  }
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

renderer.link = function ({ href, title, tokens }) {
  const text = this.parser.parseInline(tokens);
  let linkStr = `<a href="${href}"`;
  if (title) linkStr += ` title="${title}"`;
  linkStr += ' target="_blank" rel="noopener noreferrer"';
  linkStr += `>${text}</a>`;
  return linkStr;
};

renderer.image = function ({ href, title, text }) {
  let imgStr = `<img src="${href}" alt="${text || ''}"`;
  if (title) imgStr += ` title="${title}"`;
  imgStr +=
    ' loading="lazy" style="max-width: 100%; vertical-align: middle;" draggable="false" ondragstart="event.preventDefault()"';
  imgStr += '>';
  return imgStr;
};

const customMarked = new Marked({ renderer });

// Add hook for absolute safety enforcing target="_blank" on a, and draggable="false" on media
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
  if (node.tagName === 'IMG' || node.tagName === 'VIDEO') {
    node.setAttribute('draggable', 'false');
  }
});

export default function Markdown({ md, plain }: { md: string; plain?: boolean }) {
  // Compile markdown to raw HTML (runs synchronously)
  const rawHtml = customMarked.parse(md || '') as string;

  // Sanitize raw HTML string (allowing safe tags/attributes/styles, excluding scripts)
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script'],
  }) as string;

  if (plain) {
    return (
      <Typography>
        <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
      </Typography>
    );
  }

  return (
    <Paper withBorder p='md'>
      <Typography>
        <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
      </Typography>
    </Paper>
  );
}
