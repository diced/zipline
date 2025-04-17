import crypto, { CipherGCMTypes } from 'crypto';
import { hash, verify } from 'argon2';
import { randomCharacters } from './random';

const ALGORITHM = 'aes-256-cbc';

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

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

/**
 * Derives a 32-byte key from a base64 encoded string.
 * Throws an error if the decoded key is not 32 bytes.
 */
function deriveKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 32) {
    throw new Error('Encryption key must be a base64 encoded 32-byte key.');
  }
  return key;
}

/**
 * Encrypts a buffer using AES-256-GCM or ChaCha20-Poly1305.
 * Prepends IV and appends Auth Tag to the ciphertext.
 * @param buffer The buffer to encrypt.
 * @param base64Key The base64 encoded 32-byte encryption key.
 * @param algorithm The encryption algorithm to use.
 * @returns A buffer containing [IV][Ciphertext][AuthTag].
 */
export async function encryptBuffer(
  buffer: Buffer,
  base64Key: string,
  algorithm: 'aes-256-gcm' | 'chacha20-poly1305',
): Promise<Buffer> {
  try {
    const key = deriveKey(base64Key);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm as CipherGCMTypes, key, iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`invalid auth tag length: ${authTag.length}`);
    }

    return Buffer.concat([iv, encrypted, authTag]);
  } catch (error) {
    console.error('encryption failed:', error);
    throw new Error('Failed to encrypt buffer.');
  }
}

/**
 * Decrypts a buffer encrypted with AES-256-GCM or ChaCha20-Poly1305.
 * Expects the buffer format: [IV][Ciphertext][AuthTag].
 * @param encryptedBuffer The buffer containing the encrypted data.
 * @param base64Key The base64 encoded 32-byte encryption key.
 * @param algorithm The encryption algorithm used.
 * @returns The original decrypted buffer, or null if decryption fails (e.g., bad key, tampered data).
 */
export async function decryptBuffer(
  encryptedBuffer: Buffer,
  base64Key: string,
  algorithm: 'aes-256-gcm' | 'chacha20-poly1305',
): Promise<Buffer | null> {
  try {
    const key = deriveKey(base64Key);

    if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      console.error('decryption failed: encrypted buffer is too short.');
      return null;
    }

    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const authTag = encryptedBuffer.subarray(encryptedBuffer.length - AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.subarray(IV_LENGTH, encryptedBuffer.length - AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(algorithm as CipherGCMTypes, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted;
  } catch (error) {
    console.error('decryption failed:', error);
    return null;
  }
}
