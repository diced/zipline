import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import dayjsRelativeTime from 'dayjs/plugin/relativeTime';
import ms, { StringValue } from 'ms';
dayjs.extend(duration);
dayjs.extend(dayjsRelativeTime);

export function jsonUserReplacer(key: string, value: unknown) {
  if (key === 'avatar') return 'data:image/*;base64,***';

  return value;
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

export function parseExpiry(header: string): Date {
  if (!header) throw new Error('no expiry provided');
  header = header.toLowerCase();

  if (header.startsWith('date=')) {
    const date = new Date(header.substring(5));

    if (!date.getTime()) throw new Error('invalid date');
    if (date.getTime() < Date.now()) throw new Error('expiry must be in the future');
    return date;
  }

  const human = humanTime(header);

  if (!human) throw new Error('failed to parse human time');
  if (human.getTime() < Date.now()) throw new Error('expiry must be in the future');

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

export function expireText(to_: string, from_: string = new Date().toLocaleString()) {
  const from = new Date(from_);
  const to = new Date(to_);

  if (from.getTime() < to.getTime()) {
    return `Expires ${dayjs(to).from(from)}`;
  } else {
    return `Expired ${dayjs(from).to(to)}`;
  }
}

export function expireReadToDate(expires: string): Date {
  if (expires === 'never') return null;

  return new Date(
    {
      '5min': Date.now() + 5 * 60 * 1000,
      '10min': Date.now() + 10 * 60 * 1000,
      '15min': Date.now() + 15 * 60 * 1000,
      '30min': Date.now() + 30 * 60 * 1000,
      '1h': Date.now() + 60 * 60 * 1000,
      '2h': Date.now() + 2 * 60 * 60 * 1000,
      '3h': Date.now() + 3 * 60 * 60 * 1000,
      '4h': Date.now() + 4 * 60 * 60 * 1000,
      '5h': Date.now() + 5 * 60 * 60 * 1000,
      '6h': Date.now() + 6 * 60 * 60 * 1000,
      '8h': Date.now() + 8 * 60 * 60 * 1000,
      '12h': Date.now() + 12 * 60 * 60 * 1000,
      '1d': Date.now() + 24 * 60 * 60 * 1000,
      '3d': Date.now() + 3 * 24 * 60 * 60 * 1000,
      '5d': Date.now() + 5 * 24 * 60 * 60 * 1000,
      '7d': Date.now() + 7 * 24 * 60 * 60 * 1000,
      '1w': Date.now() + 7 * 24 * 60 * 60 * 1000,
      '1.5w': Date.now() + 1.5 * 7 * 24 * 60 * 60 * 1000,
      '2w': Date.now() + 2 * 7 * 24 * 60 * 60 * 1000,
      '3w': Date.now() + 3 * 7 * 24 * 60 * 60 * 1000,
      '1m': Date.now() + 30 * 24 * 60 * 60 * 1000,
      '1.5m': Date.now() + 1.5 * 30 * 24 * 60 * 60 * 1000,
      '2m': Date.now() + 2 * 30 * 24 * 60 * 60 * 1000,
      '3m': Date.now() + 3 * 30 * 24 * 60 * 60 * 1000,
      '6m': Date.now() + 6 * 30 * 24 * 60 * 60 * 1000,
      '8m': Date.now() + 8 * 30 * 24 * 60 * 60 * 1000,
      '1y': Date.now() + 365 * 24 * 60 * 60 * 1000,
    }[expires],
  );
}

export function colorHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + value.toString(16)).substr(-2);
  }

  return color;
}
