import { stripHtml } from './stripHtml';

export function formatRootUrl(
  route: string,
  src: string,
  query: Record<string, string | null | undefined> = {},
) {
  const path = `${route === '/' ? '' : route}/${encodeURIComponent(src)}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null) params.set(key, value);
  }

  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function formatMediaUrl(host: string, filename: string): string {
  return stripHtml(`${host}${formatRootUrl('/raw', filename)}`);
}

export function trimUrl(length: number, url: string) {
  return url.length > length ? `${url.slice(0, length)}...` : url;
}
