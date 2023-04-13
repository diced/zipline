import { InvisibleFile, InvisibleUrl } from '@prisma/client';
import { hash, verify } from 'argon2';
import { randomBytes } from 'crypto';
import { readdir, stat } from 'fs/promises';
import prisma from 'lib/prisma';
import { join } from 'path';

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

export function chunk<T>(arr: T[], size: number): Array<T[]> {
  const result = [];
  const L = arr.length;
  let i = 0;

  while (i < L) {
    result.push(arr.slice(i, (i += size)));
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

export function randomInvis(length: number) {
  // some parts from https://github.com/tycrek/ass/blob/master/generators/lengthGen.js
  const invisibleCharset = ['\u200B', '\u2060', '\u200C', '\u200D'];

  return [...randomBytes(length)]
    .map((byte) => invisibleCharset[Number(byte) % invisibleCharset.length])
    .join('')
    .slice(1)
    .concat(invisibleCharset[0]);
}

export function createInvisImage(length: number, fileId: number) {
  const retry = async (): Promise<InvisibleFile> => {
    const invis = randomInvis(length);

    const existing = await prisma.invisibleFile.findUnique({
      where: {
        invis,
      },
    });

    if (existing) return retry();

    const inv = await prisma.invisibleFile.create({
      data: {
        invis,
        fileId,
      },
    });

    return inv;
  };

  return retry();
}

export function createInvisURL(length: number, urlId: string) {
  const retry = async (): Promise<InvisibleUrl> => {
    const invis = randomInvis(length);

    const existing = await prisma.invisibleUrl.findUnique({
      where: {
        invis,
      },
    });

    if (existing) return retry();

    const ur = await prisma.invisibleUrl.create({
      data: {
        invis,
        urlId,
      },
    });

    return ur;
  };

  return retry();
}

export async function getBase64URLFromURL(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return `data:${res.headers.get('content-type')};base64,${base64}`;
}

export function notNull(a: unknown, b: unknown) {
  return a !== null && b !== null;
}

export function notNullArray(arr: unknown[]) {
  return !arr.some((x) => x === null);
}
