import { bytes } from './bytes';
import { File } from './db/models/file';
import { Url } from './db/models/url';
import { User } from './db/models/user';
import { log } from './logger';

export type ParseValue = {
  file?: File;
  url?: Url;
  user?: User | Omit<User, 'oauthProviders' | 'passkeys'>;

  link?: {
    returned?: string;
    raw?: string;
  };

  debug?: {
    json?: string;
  };
};

const logger = log('parser');

export function parseString(str: string, value: ParseValue) {
  if (!str) return null;
  str = str.replace(/\\n/g, '\n');

  if (process.env.DEBUG === 'zipline') {
    value.debug = {
      json: JSON.stringify(
        {
          file: value.file || null,
          url: value.url || null,
          user: value.user || null,
          link: value.link || null,
        },
        (key, value) => {
          if (key === 'password' || key === 'avatar') return '***';
          if (key === 'reg' || key === 'passkeys') return 'passkey registration redacted';
          if (key === 'oauthProviders') return 'oauth providers redacted';

          return value;
        },
      ),
    };
  }

  const re = /\{(?<type>file|url|user|debug|link)\.(?<prop>\w+)(::(?<mod>\w+))?(::(?<mod_tzlocale>\S+))?\}/gi;
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

    if (['password', 'avatar', 'passkeys', 'oauthProviders'].includes(matches.groups.prop)) {
      str = replaceCharsFromString(str, '{unknown_property}', index, re.lastIndex);
      re.lastIndex = index;
      continue;
    }

    if (['originalName', 'name'].includes(matches.groups.prop)) {
      const decoded = decodeURIComponent(escape(getV[matches.groups.prop as keyof ParseValue['file']]));
      str = replaceCharsFromString(
        str,
        modifier(matches.groups.mod || 'string', decoded),
        index,
        re.lastIndex,
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
      str = replaceCharsFromString(
        str,
        modifier(matches.groups.mod, v, matches.groups.mod_tzlocale ?? undefined),
        index,
        re.lastIndex,
      );
      re.lastIndex = index;
      continue;
    }

    str = replaceCharsFromString(str, v, index, re.lastIndex);
    re.lastIndex = index;
  }

  return str;
}

function modifier(mod: string, value: unknown, tzlocale?: string): string {
  mod = mod.toLowerCase();

  if (value instanceof Date) {
    const args: [string?, { timeZone: string }?] = [undefined, undefined];

    if (tzlocale) {
      const [locale, tz] = tzlocale.split(/\s?,\s?/).map((v) => v.trim());

      if (locale) {
        try {
          Intl.DateTimeFormat.supportedLocalesOf(locale);
          args[0] = locale;
        } catch (e) {
          args[0] = undefined;
          logger.error(`invalid locale provided ${locale}`);
        }
      }

      if (tz) {
        const intlTz = Intl.supportedValuesOf('timeZone').find((v) => v.toLowerCase() === tz.toLowerCase());
        if (intlTz) args[1] = { timeZone: intlTz };
        else {
          args[1] = undefined;
          logger.error(`invalid timezone provided ${tz}`);
        }
      }
    }

    switch (mod) {
      case 'locale':
        return value.toLocaleString(...args);
      case 'time':
        return value.toLocaleTimeString(...args);
      case 'date':
        return value.toLocaleDateString(...args);
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
      case 'string':
        return value.toString();
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
      case 'string':
        return value;
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
      case 'string':
        return value.toString();
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
      case 'string':
        return value ? 'true' : 'false';
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
