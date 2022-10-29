import { createHmac, timingSafeEqual } from 'crypto';

export function sign(value: string, secret: string): string {
  const signed = value + ':' + createHmac('sha256', secret).update(value).digest('base64').replace(/=+$/, '');

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
