import { config } from '@/lib/config';
import { decrypt, encrypt } from '@/lib/crypto';
import { randomCharacters } from '@/lib/random';

export type OAuthStateJSON = {
  mode: 'default' | 'link';
  nonce?: string;
};

export function encryptOAuthState(value: OAuthStateJSON): string {
  return encrypt(JSON.stringify(value), config.core.secret);
}

export async function generateOAuthState(
  session: { oauthState?: string; save: () => Promise<void> },
  mode: OAuthStateJSON['mode'],
): Promise<string> {
  const nonce = randomCharacters(32);
  session.oauthState = nonce;
  await session.save();

  return encryptOAuthState({ mode, nonce });
}

export function decryptOAuthState(state?: string): string | null {
  if (!state) return null;

  try {
    return decrypt(decodeURIComponent(state), config.core.secret);
  } catch {
    return null;
  }
}

export function parseOAuthState(state?: string): OAuthStateJSON | null {
  const decrypted = decryptOAuthState(state);
  if (!decrypted) return null;

  // legacy
  if (decrypted === 'link') return { mode: 'link' };
  if (decrypted === 'default') return { mode: 'default' };

  try {
    const parsed = JSON.parse(decrypted) as Partial<OAuthStateJSON>;
    if (parsed?.mode !== 'default' && parsed?.mode !== 'link') return null;

    return {
      mode: parsed.mode,
      nonce: parsed.nonce,
    };
  } catch {
    return null;
  }
}
