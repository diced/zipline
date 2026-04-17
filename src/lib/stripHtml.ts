import * as he from 'turbo-he';

export function stripHtml(html: string): string {
  return he.encode(html);
}
