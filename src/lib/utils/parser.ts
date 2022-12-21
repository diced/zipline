import type { Image, User, Url, UserEmbed } from '@prisma/client';

export type ParseValue = {
  file?: Image;
  url?: Url;
  user?: User & { embed?: UserEmbed };

  link?: string;
  raw_link?: string;
};

export function parseString(str: string, value: ParseValue) {
  str = str.replace(/\{link\}/gi, value.link).replace(/\{raw_link\}/gi, value.raw_link);

  const re = /\{(?<type>file|url|user)\.(?<prop>\w+)(\.?(?<subprop>\w+))?(::(?<mod>\w+))?\}/gi;
  let matches: RegExpMatchArray;

  while ((matches = re.exec(str))) {
    const getV = value[matches.groups.type];
    if (!getV) {
      str = replaceCharsFromString(str, '{unknown_type}', matches.index, re.lastIndex);
      re.lastIndex = matches.index;
      continue;
    }

    if (matches.groups.prop in ['password', 'avatar']) {
      str = replaceCharsFromString(str, '{unknown_property}', matches.index, re.lastIndex);
      re.lastIndex = matches.index;
      continue;
    }

    const v = getV[matches.groups.prop];

    if (v === undefined) {
      str = replaceCharsFromString(str, '{unknown_property}', matches.index, re.lastIndex);
      re.lastIndex = matches.index;
      continue;
    } else if (typeof v === 'object' && !matches.groups.subprop) {
      str = replaceCharsFromString(str, '{unknown_property}', matches.index, re.lastIndex);
      re.lastIndex = matches.index;
      continue;
    }

    if (matches.groups.subprop !== undefined) {
      const subv = v[matches.groups.subprop];
      if (subv === undefined) {
        str = replaceCharsFromString(str, '{unknown_property}', matches.index, re.lastIndex);
        re.lastIndex = matches.index;
        continue;
      }

      if (matches.groups.mod) {
        str = replaceCharsFromString(str, modifier(matches.groups.mod, subv), matches.index, re.lastIndex);
        re.lastIndex = matches.index;
        continue;
      }

      str = replaceCharsFromString(str, subv, matches.index, re.lastIndex);
      re.lastIndex = matches.index;
      continue;
    }

    if (matches.groups.mod) {
      str = replaceCharsFromString(str, modifier(matches.groups.mod, v), matches.index, re.lastIndex);
      re.lastIndex = matches.index;
      continue;
    }

    str = replaceCharsFromString(str, v, matches.index, re.lastIndex);
    re.lastIndex = matches.index;
  }

  return str;
}

function modifier(mod: string, value: any): string {
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
        return '{unknown_date_modifier}';
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
        return '{unknown_str_modifier}';
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
      default:
        return '{unknown_int_modifier}';
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
        return '{unknown_bool_modifier}';
    }
  }

  return '{unknown_modifier}';
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
