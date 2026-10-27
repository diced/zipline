import { encode } from 'he';

export function isDiscordCrawler(userAgent?: string) {
  return /(?:Discordbot|Discord-Embedded-App-SDK)/i.test(userAgent ?? '');
}

export function createNoPreviewHtml() {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"></head><body></body></html>';
}

export function createComponentPreviewHtml(
  shortUrl: string,
  destination: string,
  componentEmbed: string | null,
) {
  const safeUrl = encode(shortUrl, { useNamedReferences: false });
  const safeDestination = encode(destination, { useNamedReferences: false });

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta property="og:title" content="Shortened URL"><meta property="og:description" content="${safeDestination}"><meta property="og:url" content="${safeUrl}">${componentEmbed ? `<script id="discord:component-embed" type="application/json">${componentEmbed}</script>` : ''}</head><body></body></html>`;
}
