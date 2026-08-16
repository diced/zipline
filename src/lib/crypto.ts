import crypto from 'crypto';
import { hash, verify } from 'argon2';
import { randomCharacters } from './random';

const ALGORITHM = 'aes-256-gcm';

function createKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

export function encrypt(value: string, secret: string): string {
  const key = createKey(secret);
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}.${encrypted.toString('hex')}.${tag.toString('hex')}`;
}

export function decrypt(value: string, secret: string): string {
  const key = createKey(secret);
  const [ivHex, encryptedHex, tagHex] = value.split('.');
  if (!ivHex || !encryptedHex || !tagHex) throw new Error('Invalid values');

  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
}

export function createToken(): string {
  const date = Date.now();
  const random = randomCharacters(32);

  const date64 = Buffer.from(date.toString()).toString('base64');
  const random64 = Buffer.from(random).toString('base64');

  return `${date64}.${random64}`;
}

export function encryptToken(token: string, secret: string): string {
  const date = Date.now();
  const date64 = Buffer.from(date.toString()).toString('base64');

  const encrypted = encrypt(token, secret);
  const encrypted64 = Buffer.from(encrypted).toString('base64');

  return `${date64}.${encrypted64}`;
}

export function decryptToken(encryptedToken: string, secret: string): [number, string] | null {
  const [date64, encrypted64] = encryptedToken.split('.');
  if (!date64 || !encrypted64) return null;

  try {
    const date = parseInt(Buffer.from(date64, 'base64').toString('ascii'), 10);
    const encrypted = Buffer.from(encrypted64, 'base64').toString('ascii');

    return [date, decrypt(encrypted, secret)];
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  return hash(password);
}

export async function verifyPassword(password: string, hash: string) {
  return verify(hash, password);
}
