import { config } from '@/lib/config';
import { decrypt, encrypt } from '@/lib/crypto';

type AccessTokenPayload = {
  type: string;
  id: string;
  expiry: number;
};

export function createAccessToken({
  type,
  id,
  expiresIn = 5 * 60_000,
}: {
  type: string;
  id: string;
  expiresIn?: number;
}): string {
  const payload: AccessTokenPayload = {
    type: type,
    id,
    expiry: Date.now() + expiresIn,
  };

  return encrypt(JSON.stringify(payload), config.core.secret);
}

export function getAccessTokenId(token: string | null | undefined, type: string): string | null {
  if (!token) return null;

  try {
    const raw = decrypt(token, config.core.secret);
    const payload = JSON.parse(raw) as Partial<AccessTokenPayload>;
    if (!payload || typeof payload !== 'object') return null;

    if (payload.type !== type) return null;
    if (typeof payload.id !== 'string') return null;
    if (typeof payload.expiry !== 'number' || !Number.isFinite(payload.expiry)) return null;
    if (payload.expiry < Date.now()) return null;

    return payload.id;
  } catch {
    return null;
  }
}

export function verifyAccessToken(token: string | null | undefined, type: string, id: string): boolean {
  return getAccessTokenId(token, type) === id;
}
