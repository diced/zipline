import { bytes } from './bytes';
import { File } from './db/models/file';
import { User } from './db/models/user';

export type ParseValue = {
  file?: File;
  user?: User | Omit<User, 'oauthProviders'>;

  link?: string;
  raw_link?: string;
};

export function parseString(str: string, value: ParseValue) {
  if (!str) return null;
  str = str
    .replace(/\{link\}/gi, value.link ?? '{unknown_link}')
    .replace(/\{raw_link\}/gi, value.raw_link ?? '{unknown_raw_link}')
    .replace(/\\n/g, '\n');

  const re = /\{(?<type>file|url|user)\.(?<prop>\w+)(::(?<mod>\w+))?\}/gi;
  let matches: RegExpMatchArray | null;

  while ((matches = re.exec(str))) {
    if (!matches.groups) continue;

    const index = matches.index as number;

    const getV = value[matches.groups.type as keyof ParseValue];
    if (!getV) {
      str = replaceCharsFromString(str, '{unknown_type}', index, re.lastIndex);
      re.lastIndex = index;
      continue;
    }

    if (['password', 'avatar', 'uuid'].includes(matches.groups.prop)) {
      str = replaceCharsFromString(str, '{unknown_property}', index, re.lastIndex);
      re.lastIndex = index;
      continue;
    }

    if (['originalName', 'name'].includes(matches.groups.prop)) {
      str = replaceCharsFromString(
        str,
        decodeURIComponent(escape(getV[matches.groups.prop as keyof ParseValue['file']])),
        index,
        re.lastIndex
      );
      re.lastIndex = index;
      continue;
    }

    const v = getV[matches.groups.prop as keyof ParseValue['file'] | keyof ParseValue['user']];

    if (v === undefined) {
      str = replaceCharsFromString(str, '{unknown_property}', index, re.lastIndex);
      re.lastIndex = index;
      continue;
    }

    if (matches.groups.mod) {
      str = replaceCharsFromString(str, modifier(matches.groups.mod, v), index, re.lastIndex);
      re.lastIndex = index;
      continue;
    }

    str = replaceCharsFromString(str, v, index, re.lastIndex);
    re.lastIndex = index;
  }

  return str;
}

function modifier(mod: string, value: unknown): string {
  mod = mod.toLowerCase();

  if (value instanceof Date) {
    switch (mod) {
      case 'locale':
        return value.toLocaleString();
      case 'time':
        return value.toLocaleTimeString();
      case 'date':
        return value.toLocaleDateString();
      case 'unix':
        return Math.floor(value.getTime() / 1000).toString();
      case 'iso':
        return value.toISOString();
      case 'utc':
        return value.toUTCString();
      case 'year':
        return value.getFullYear().toString();
      case 'month':
        return (value.getMonth() + 1).toString();
      case 'day':
        return value.getDate().toString();
      case 'hour':
        return value.getHours().toString();
      case 'minute':
        return value.getMinutes().toString();
      case 'second':
        return value.getSeconds().toString();
      default:
        return `{unknown_date_modifier(${mod})}`;
    }
  } else if (typeof value === 'string') {
    switch (mod) {
      case 'upper':
        return value.toUpperCase();
      case 'lower':
        return value.toLowerCase();
      case 'title':
        return value.charAt(0).toUpperCase() + value.slice(1);
      case 'length':
        return value.length.toString();
      case 'reverse':
        return value.split('').reverse().join('');
      case 'base64':
        return btoa(value);
      case 'hex':
        return toHex(value);
      default:
        return `{unknown_str_modifier(${mod})}`;
    }
  } else if (typeof value === 'number') {
    switch (mod) {
      case 'comma':
        return value.toLocaleString();
      case 'hex':
        return value.toString(16);
      case 'octal':
        return value.toString(8);
      case 'binary':
        return value.toString(2);
      case 'bytes':
        return bytes(value);
      default:
        return `{unknown_int_modifier(${mod})}`;
    }
  } else if (typeof value === 'boolean') {
    switch (mod) {
      case 'yesno':
        return value ? 'Yes' : 'No';
      case 'onoff':
        return value ? 'On' : 'Off';
      case 'truefalse':
        return value ? 'True' : 'False';
      default:
        return `{unknown_bool_modifier(${mod})}`;
    }
  }

  return `{unknown_modifier(${mod})}`;
}

function replaceCharsFromString(str: string, replace: string, start: number, end: number): string {
  return str.slice(0, start) + replace + str.slice(end);
}

function toHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    hex += '' + str.charCodeAt(i).toString(16);
  }
  return hex;
}
