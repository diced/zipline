import { fetchExternal } from '@/lib/fetchExternal';

export async function fetchOidcAvatar(picture: unknown, userinfoUrl: string): Promise<string | null> {
  const response = await fetchExternal(picture, { origin: userinfoUrl });
  if (!response?.body.length) return null;

  const contentType = response.contentType?.split(';')[0].trim().toLowerCase();
  if (!contentType || !/^image\/[a-z0-9.+-]+$/.test(contentType)) return null;

  return `data:${contentType};base64,${response.body.toString('base64')}`;
}
