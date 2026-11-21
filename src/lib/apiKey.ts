import crypto from 'crypto';
import { z } from 'zod';

export const API_KEY_SCOPES = ['files:read', 'files:write', 'urls:read', 'urls:write'] as const;
export const apiKeyScopeSchema = z.enum(API_KEY_SCOPES);
export type ApiKeyScope = z.infer<typeof apiKeyScopeSchema>;

const TOKEN_PREFIX = 'zpl';
const TOKEN_PATTERN = /^zpl_([A-Za-z0-9_-]{12})_([A-Za-z0-9_-]{43})$/;

export function createApiKeyToken() {
  const prefix = crypto.randomBytes(9).toString('base64url');
  const secret = crypto.randomBytes(32).toString('base64url');
  const token = `${TOKEN_PREFIX}_${prefix}_${secret}`;

  return { prefix, token, secretHash: hashApiKeyToken(token) };
}

export function parseApiKeyToken(token: string) {
  const match = TOKEN_PATTERN.exec(token);
  return match ? { prefix: match[1]!, token } : null;
}

export function hashApiKeyToken(token: string) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function apiKeyHashesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function requiredApiKeyScope(method: string, path: string): ApiKeyScope | null {
  const normalizedMethod = method.toUpperCase();
  const read = normalizedMethod === 'GET' || normalizedMethod === 'HEAD';

  if (path === '/api/upload' || path === '/api/upload/partial') return 'files:write';

  if (
    path === '/api/user/files' ||
    path.startsWith('/api/user/files/') ||
    path === '/api/user/folders' ||
    path.startsWith('/api/user/folders/') ||
    path === '/api/user/tags' ||
    path.startsWith('/api/user/tags/')
  ) {
    if (path.endsWith('/password') && normalizedMethod === 'POST') return 'files:read';
    return read ? 'files:read' : 'files:write';
  }

  if (path === '/api/user/urls' || path.startsWith('/api/user/urls/')) {
    if (path.endsWith('/password') && normalizedMethod === 'POST') return 'urls:read';
    return read ? 'urls:read' : 'urls:write';
  }

  return null;
}
