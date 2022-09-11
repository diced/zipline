import type { Image, ImageFormat, User } from '@prisma/client';
import ms, { StringValue } from 'ms';

export function parse(str: string, image: Image, user: User) {
  if (!str) return null;

  return str
    .replace(/{user.admin}/gi, user.administrator ? 'yes' : 'no')
    .replace(/{user.id}/gi, user.id.toString())
    .replace(/{user.name}/gi, user.username)
    .replace(/{image.id}/gi, image.id.toString())
    .replace(/{image.mime}/gi, image.mimetype)
    .replace(/{image.file}/gi, image.file)
    .replace(/{image.created_at.full_string}/gi, image.created_at.toLocaleString())
    .replace(/{image.created_at.time_string}/gi, image.created_at.toLocaleTimeString())
    .replace(/{image.created_at.date_string}/gi, image.created_at.toLocaleDateString());
}

export function bytesToRead(bytes: number) {
  if (isNaN(bytes)) return '0.0 B';
  if (bytes === Infinity) return '0.0 B';
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
  let num = 0;

  while (bytes > 1024) {
    bytes /= 1024;
    ++num;
  }

  return `${bytes.toFixed(1)} ${units[num]}`;
}

export const units = {
  year: 365 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
};

export function relativeTime(to: Date, from: Date = new Date()) {
  const time = new Date(to.getTime() - from.getTime());
  
  const rtf = new Intl.RelativeTimeFormat('en', { style: 'long' });

  for (const unit in units) {
    if (time > units[unit]) {
      return rtf.format(Math.floor(Math.round(time.getTime() / units[unit])), unit as Intl.RelativeTimeFormatUnit || 'second');
    }
  }
}

export function humanTime(string: StringValue | string): Date {
  try {
    const mil = ms(string as StringValue);
    if (typeof mil !== 'number') return null; 
    if (isNaN(mil)) return null;
    if (!mil) return null;
  
    return new Date(Date.now() + mil);
  } catch (_) {
    return null;
  }
}

export function parseExpiry(header: string): Date | null {
  if (!header) return null;
  header = header.toLowerCase();

  if (header.startsWith('date=')) {
    const date = new Date(header.substring(5));

    if (!date.getTime()) return null;
    if (date.getTime() < Date.now()) return null;
    return date;
  }

  const human = humanTime(header);

  if (!human) return null;
  if (human.getTime() < Date.now()) return null;

  return human;
}

export function percentChange(initial: number, final: number) {
  return ((final - initial) / initial) * 100;
}