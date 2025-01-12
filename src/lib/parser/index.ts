import { bytes } from '../bytes';
import { File } from '../db/models/file';
import { Url } from '../db/models/url';
import { User } from '../db/models/user';
import { ParseValueMetrics } from './metrics';

export type ParseValue = {
  file?: File;
  url?: Partial<Url>;
  user?: User | Omit<User, 'oauthProviders' | 'passkeys'>;

  link?: {
    returned?: string;
    raw?: string;
  };

  metricsZipline?: ParseValueMetrics;
  metricsUser?: ParseValueMetrics;

  debug?: {
    json?: string;
    jsonf?: string;
  };
};

export function parseString(str: string, value: ParseValue) {
  if (!str) return null;
  str = str.replace(/\\n/g, '\n');

  const replacer = (key: string, value: unknown) => {
    if (key === 'password' || key === 'avatar') return '***';
    if (key === 'reg' || key === 'passkeys') return 'passkey registration redacted';
    if (key === 'oauthProviders') return 'oauth providers redacted';

    return value;
  };

  const data = {
    file: value.file || null,
    url: value.url || null,
    user: value.user || null,
    link: value.link || null,
    metricsUser: value.metricsUser,
    metricsZipline: value.metricsZipline,
  };

  value.debug = {
    json: JSON.stringify(data, replacer),
    jsonf: JSON.stringify(data, replacer, 2),
  };

  const re =
    /\{(?<type>file|url|user|debug|link|metricsUser|metricsZipline)\.(?<prop>\w+)(::(?<mod>(\w+|<|<=|=|>=|>|\^|\$|~|\/)+))?((::(?<mod_tzlocale>\S+))|(?<mod_check>\[(?<mod_check_true>".*")\|\|(?<mod_check_false>".*")\]))?\}/gi;
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

    if (['password', 'avatar', 'passkeys', 'oauthProviders', 'tags'].includes(matches.groups.prop)) {
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
        modifier(
          matches.groups.mod,
          v,
          matches.groups.mod_tzlocale ?? undefined,
          matches.groups.mod_check_true ?? undefined,
          matches.groups.mod_check_false ?? undefined,
          value,
        ),
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

function modifier(
  mod: string,
  value: unknown,
  tzlocale?: string,
  check_true?: string,
  check_false?: string,
  _value?: ParseValue,
): string {
  mod = mod.toLowerCase();
  check_true = check_true?.slice(1, -1);
  check_false = check_false?.slice(1, -1);

  if (value instanceof Date) {
    const args: [string?, { timeZone: string }?] = [undefined, undefined];

    if (tzlocale) {
      const [locale, tz] = tzlocale.split(/\s?,\s?/).map((v) => v.trim());

      if (locale) {
        try {
          Intl.DateTimeFormat.supportedLocalesOf(locale);
          args[0] = locale;
        } catch {
          args[0] = undefined;
          console.error(`invalid locale provided ${locale}`);
        }
      }

      if (tz) {
        const intlTz = Intl.supportedValuesOf('timeZone').find((v) => v.toLowerCase() === tz.toLowerCase());
        if (intlTz) args[1] = { timeZone: intlTz };
        else {
          args[1] = undefined;
          console.error(`invalid timezone provided ${tz}`);
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
      case 'ampm':
        return value.getHours() < 12 ? 'am' : 'pm';
      case 'AMPM':
        return value.getHours() < 12 ? 'AM' : 'PM';
      default:
        return `{unknown_date_modifier(${mod})}`;
    }
  } else if (typeof value === 'string') {
    switch (true) {
      case mod == 'upper':
        return value.toUpperCase();
      case mod == 'lower':
        return value.toLowerCase();
      case mod == 'title':
        return value.charAt(0).toUpperCase() + value.slice(1);
      case mod == 'length':
        return value.length.toString();
      case mod == 'reverse':
        return value.split('').reverse().join('');
      case mod == 'base64':
        return btoa(value);
      case mod == 'hex':
        return toHex(value);
      case mod == 'string':
        return value;
      case mod.startsWith('exists'): {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_str_modifier(${mod})}`;

        if (_value) {
          return value
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value ? check_true : check_false;
      }
      case mod.startsWith('='): {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_str_modifier(${mod})}`;

        const check = mod.replace('=', '');

        if (!check) return `{unknown_str_modifier(${mod})}`;

        if (_value) {
          return value.toLowerCase() == check
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value.toLowerCase() == check ? check_true : check_false;
      }
      case mod.startsWith('$'): {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_str_modifier(${mod})}`;

        const check = mod.replace('$', '');

        if (!check) return `{unknown_str_modifier(${mod})}`;

        if (_value) {
          return value.toLowerCase().startsWith(check)
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value.toLowerCase().startsWith(check) ? check_true : check_false;
      }
      case mod.startsWith('^'): {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_str_modifier(${mod})}`;

        const check = mod.replace('^', '');

        if (!check) return `{unknown_str_modifier(${mod})}`;

        if (_value) {
          return value.toLowerCase().endsWith(check)
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value.toLowerCase().endsWith(check) ? check_true : check_false;
      }
      case mod.startsWith('~'): {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_str_modifier(${mod})}`;

        const check = mod.replace('~', '');

        if (!check) return `{unknown_str_modifier(${mod})}`;

        if (_value) {
          return value.toLowerCase().includes(check)
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value.toLowerCase().includes(check) ? check_true : check_false;
      }
      default:
        return `{unknown_str_modifier(${mod})}`;
    }
  } else if (typeof value === 'number') {
    switch (true) {
      case mod == 'comma':
        return value.toLocaleString();
      case mod == 'hex':
        return value.toString(16);
      case mod == 'octal':
        return value.toString(8);
      case mod == 'binary':
        return value.toString(2);
      case mod == 'bytes':
        return bytes(value);
      case mod == 'string':
        return value.toString();
      case mod.startsWith('>='): {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_int_modifier(${mod})}`;

        const check = Number(mod.replace('>=', ''));

        if (Number.isNaN(check)) return `{unknown_int_modifier(${mod})}`;

        if (_value) {
          return value >= check
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value >= check ? check_true : check_false;
      }
      case mod.startsWith('>'): {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_int_modifier(${mod})}`;

        const check = Number(mod.replace('>', ''));

        if (Number.isNaN(check)) return `{unknown_int_modifier(${mod})}`;

        if (_value) {
          return value > check
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value > check ? check_true : check_false;
      }
      case mod.startsWith('='): {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_int_modifier(${mod})}`;

        const check = Number(mod.replace('=', ''));

        if (Number.isNaN(check)) return `{unknown_int_modifier(${mod})}`;

        if (_value) {
          return value == check
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value == check ? check_true : check_false;
      }
      case mod.startsWith('<='): {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_int_modifier(${mod})}`;

        const check = Number(mod.replace('<=', ''));

        if (Number.isNaN(check)) return `{unknown_int_modifier(${mod})}`;

        if (_value) {
          return value <= check
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value <= check ? check_true : check_false;
      }
      case mod.startsWith('<'): {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_int_modifier(${mod})}`;

        const check = Number(mod.replace('<', ''));

        if (Number.isNaN(check)) return `{unknown_int_modifier(${mod})}`;

        if (_value) {
          return value < check
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value < check ? check_true : check_false;
      }
      default:
        return `{unknown_int_modifier(${mod})}`;
    }
  } else if (typeof value === 'boolean') {
    switch (true) {
      case mod == 'istrue': {
        if (typeof check_true !== 'string' || typeof check_false !== 'string')
          return `{unknown_bool_modifier(${mod})}`;

        if (_value) {
          return value
            ? parseString(check_true, _value) || check_true
            : parseString(check_false, _value) || check_false;
        }

        return value ? check_true : check_false;
      }
      default:
        return `{unknown_bool_modifier(${mod})}`;
    }
  }

  if (
    typeof check_false == 'string' &&
    ['>', '>=', '=', '<=', '<', '~', '$', '^'].some((modif) => mod.startsWith(modif))
  ) {
    if (_value) return parseString(check_false, _value) || check_false;
    return check_false;
  }

  if (typeof check_false == 'string' && ['istrue', 'isfalse', 'exists'].includes(mod)) {
    if (_value) return parseString(check_false, _value) || check_false;
    return check_false;
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
