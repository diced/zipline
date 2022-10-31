import type { Image, User } from '@prisma/client';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import dayjsRelativeTime from 'dayjs/plugin/relativeTime';
import ms, { StringValue } from 'ms';
dayjs.extend(duration);
dayjs.extend(dayjsRelativeTime);

export function parse(str: string, image: Image, user: User) {
  if (!str) return null;

  return str
    .replace(/{user\.admin}/gi, user.administrator ? 'yes' : 'no')
    .replace(/{user\.id}/gi, user.id.toString())
    .replace(/{user\.name}/gi, user.username)
    .replace(/{image\.id}/gi, image.id.toString())
    .replace(/{image\.mime}/gi, image.mimetype)
    .replace(/{image\.file}/gi, image.file)
    .replace(/{image\.created_at.full_string}/gi, image.created_at.toLocaleString())
    .replace(/{image\.created_at.time_string}/gi, image.created_at.toLocaleTimeString())
    .replace(/{image\.created_at.date_string}/gi, image.created_at.toLocaleDateString());
}

export function randomChars(length: number) {
  const charset = 'QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890';

  let res = '';
  for (let i = 0; i !== length; ++i) res += charset[Math.floor(Math.random() * charset.length)];
  return res;
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
  if (!to) return null;

  if (to.getTime() < from.getTime()) {
    return dayjs(to).from(from);
  } else {
    return dayjs(from).to(to);
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
  if (initial === 0 && final === 0) return 0;
  if (initial === 0) return Infinity;

  return ((final - initial) / initial) * 100;
}

export function capitalize(str: string) {
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}
