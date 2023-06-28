export function serializeCookie(
  name: string,
  value: string,
  options: {
    expires?: Date;
    maxAge?: number;
    path?: string;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
) {
  const cookie = [`${name}=${value}`];

  if (options.expires) cookie.push(`Expires=${options.expires.toUTCString()}`);
  if (options.maxAge) cookie.push(`Max-Age=${options.maxAge}`);
  if (options.path) cookie.push(`Path=${options.path}`);
  if (options.sameSite) cookie.push(`SameSite=${options.sameSite}`);

  return cookie.join('; ');
}
