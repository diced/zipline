import { encode } from 'he';

export function stripHtml(html: string): string {
  return encode(html);
}
