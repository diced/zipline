import { createHmac, timingSafeEqual } from 'crypto';
import { hash, verify } from 'argon2';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import prisma from './prisma';

export async function hashPassword(s: string): Promise<string> {
  return await hash(s);
}

export function checkPassword(s: string, hash: string): Promise<boolean> {
  return verify(hash, s);
}

export function randomChars(length: number) {
  const charset = 'QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890';

  let res = '';
  for (let i = 0; i !== length; ++i) res += charset[Math.floor(Math.random() * charset.length)];
  return res;
}

export function createToken() {
  return randomChars(24) + '.' + Buffer.from(Date.now().toString()).toString('base64url');
}

export function sign(value: string, secret: string): string {
  const signed =  value + ':' + createHmac('sha256', secret)
    .update(value)
    .digest('base64')
    .replace(/=+$/, '');

  return signed;
}

export function unsign(value: string, secret: string): string {
  const str = value.slice(0, value.lastIndexOf(':'));

  const mac = sign(str, secret);

  const macBuffer = Buffer.from(mac);
  const valBuffer = Buffer.from(value);

  return timingSafeEqual(macBuffer, valBuffer) ? str : null;
}

export function sign64(value: string, secret: string): string {
  return Buffer.from(sign(value, secret)).toString('base64');
}

export function unsign64(value: string, secret: string): string {
  return unsign(Buffer.from(value, 'base64').toString(), secret);
}

export function chunk<T>(arr: T[], size: number): Array<T[]> {
  const result = []; 
  const L = arr.length;
  let i = 0;

  while (i < L) {
    result.push(arr.slice(i, i += size));
  }

  return result;
}

export async function sizeOfDir(directory: string): Promise<number> {
  const files = await readdir(directory);
  
  let size = 0;
  for (let i = 0, L = files.length; i !== L; ++i) {
    const sta = await stat(join(directory, files[i]));
    size += sta.size;
  }

  return size;
}

export function bytesToRead(bytes: number) {
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
  let num = 0;

  while (bytes > 1024) {
    bytes /= 1024;
    ++num;
  }

  return `${bytes.toFixed(1)} ${units[num]}`;
}

export function createInvisURL(length: number) {
  const invisibleCharset = ['\u200B', '\u2060', '\u200C', '\u200D'];
  for (var i = 0, output = ''; i <= length; ++i) output += invisibleCharset[Math.floor(Math.random() * 4)];
  return output;
}

export function createInvis(length: number, imageId: number) {
  const retry = async () => {
    const invis = createInvisURL(length);

    const existing = await prisma.invisibleImage.findUnique({
      where: {
        invis
      }
    });

    if (existing) return retry();
    
    const inv = await prisma.invisibleImage.create({
      data: {
        invis,
        id: imageId
      }
    });

    return inv;
  };

  return retry();
}