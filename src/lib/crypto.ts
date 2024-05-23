import crypto from 'crypto';
import { hash, verify } from 'argon2';
import { randomCharacters } from './random';

const ALGORITHM = 'aes-256-cbc';

export { randomCharacters } from './random';

export function createKey(secret: string) {
  const hash = crypto.createHash('sha256');
  hash.update(secret);

  return hash.digest('hex').slice(0, 32);
}

export function encrypt(value: string, secret: string): string {
  const key = createKey(secret);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);

  const encrypted = cipher.update(value);
  const final = cipher.final();

  const buffer = Buffer.alloc(encrypted.length + final.length);
  buffer.set(encrypted);
  buffer.set(final, encrypted.length);

  return iv.toString('hex') + '.' + buffer.toString('hex');
}

export function decrypt(value: string, secret: string): string {
  const key = createKey(secret);
  const [iv, encrypted] = value.split('.');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), Buffer.from(iv, 'hex'));

  const decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
  const final = decipher.final();

  const buffer = Buffer.alloc(decrypted.length + final.length);
  buffer.set(decrypted);
  buffer.set(final, decrypted.length);

  return buffer.toString();
}

export function createToken(): string {
  const date = Date.now();
  const random = randomCharacters(32);

  const date64 = Buffer.from(date.toString()).toString('base64');
  const random64 = Buffer.from(random).toString('base64');

  return `${date64}.${random64}`;
}

export function encryptToken(token: string, secret: string): string {
  const key = createKey(secret);

  const date = Date.now();
  const date64 = Buffer.from(date.toString()).toString('base64');

  const encrypted = encrypt(token, key);
  const encrypted64 = Buffer.from(encrypted).toString('base64');

  return `${date64}.${encrypted64}`;
}

export function decryptToken(encryptedToken: string, secret: string): [number, string] | null {
  const key = createKey(secret);
  const [date64, encrypted64] = encryptedToken.split('.');

  if (!date64 || !encrypted64) return null;

  try {
    const date = parseInt(Buffer.from(date64, 'base64').toString('ascii'), 10);

    const encrypted = Buffer.from(encrypted64, 'base64').toString('ascii');

    return [date, decrypt(encrypted, key)];
  } catch (e) {
    return null;
  }
}

export async function hashPassword(password: string) {
  return hash(password);
}

export async function verifyPassword(password: string, hash: string) {
  return verify(hash, password);
}
