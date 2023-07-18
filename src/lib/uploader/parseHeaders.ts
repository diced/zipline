import ms from 'ms';
import { Config } from '../config/validate';

// from ms@3.0.0-canary.1
type Unit =
  | 'Years'
  | 'Year'
  | 'Yrs'
  | 'Yr'
  | 'Y'
  | 'Weeks'
  | 'Week'
  | 'W'
  | 'Days'
  | 'Day'
  | 'D'
  | 'Hours'
  | 'Hour'
  | 'Hrs'
  | 'Hr'
  | 'H'
  | 'Minutes'
  | 'Minute'
  | 'Mins'
  | 'Min'
  | 'M'
  | 'Seconds'
  | 'Second'
  | 'Secs'
  | 'Sec'
  | 's'
  | 'Milliseconds'
  | 'Millisecond'
  | 'Msecs'
  | 'Msec'
  | 'Ms';
type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>;
type StringValue = `${number}` | `${number}${UnitAnyCase}` | `${number} ${UnitAnyCase}`;

export type UploadHeaders = {
  'x-zipline-deletes-at': string;
  'x-zipline-format': Config['files']['defaultFormat'];
  'x-zipline-image-compression-percent': string;
  'x-zipline-password': string;
  'x-zipline-max-views': string;
  'x-zipline-no-json': 'true' | 'false';
  'x-zipline-original-name': 'true' | 'false';

  'x-zipline-folder': string;

  'x-zipline-filename': string;
  'x-zipline-domain': string;
};

export type UploadOptions = {
  deletesAt?: Date;
  format?: Config['files']['defaultFormat'];
  imageCompressionPercent?: number;
  password?: string;
  maxViews?: number;
  noJson?: boolean;
  addOriginalName?: boolean;
  overrides?: {
    filename?: string;
    returnDomain?: string;
  };

  folder?: string;

  // error
  header?: string;
  message?: string;
};

export function humanTime(string: StringValue | string): Date | null {
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

function headerError(header: keyof UploadHeaders, message: string) {
  return {
    header,
    message,
  };
}

const FORMATS = ['random', 'uuid', 'date', 'name'];

export function parseHeaders(headers: UploadHeaders, fileConfig: Config['files']): UploadOptions {
  const response: UploadOptions = {};

  if (headers['x-zipline-deletes-at']) {
    const expiresAt = parseExpiry(headers['x-zipline-deletes-at']);
    if (!expiresAt) return headerError('x-zipline-deletes-at', 'Invalid expiry date');

    response.deletesAt = expiresAt;
  } else {
    if (fileConfig.defaultExpiration) {
      const expiresAt = new Date(Date.now() + fileConfig.defaultExpiration);
      response.deletesAt = expiresAt;
    }
  }

  const format = headers['x-zipline-format'];
  if (format) {
    if (!FORMATS.includes(format)) return headerError('x-zipline-format', 'Invalid format');

    response.format = format;
  } else {
    response.format = fileConfig.defaultFormat;
  }

  const imageCompressionPercent = headers['x-zipline-image-compression-percent'];
  if (imageCompressionPercent) {
    const num = Number(imageCompressionPercent);
    if (isNaN(num))
      return headerError('x-zipline-image-compression-percent', 'Invalid compression percent (NaN)');

    if (num < 0 || num > 100)
      return headerError(
        'x-zipline-image-compression-percent',
        'Invalid compression percent (must be between 0 and 100)'
      );

    response.imageCompressionPercent = num;
  }

  const password = headers['x-zipline-password'];
  if (password) response.password = password;

  const maxViews = headers['x-zipline-max-views'];
  if (maxViews) {
    const num = Number(maxViews);
    if (isNaN(num)) return headerError('x-zipline-max-views', 'Invalid max views (NaN)');

    response.maxViews = num;
  }

  const noJson = headers['x-zipline-no-json'];
  if (noJson) response.noJson = noJson === 'true';

  const addOriginalName = headers['x-zipline-original-name'];
  if (addOriginalName) response.addOriginalName = addOriginalName === 'true';


  const folder = headers['x-zipline-folder'];
  if (folder) {
    // TODO: add check for folder
    response.folder = folder;
  }

  response.overrides = {};

  const filename = headers['x-zipline-filename'];
  if (filename) response.overrides.filename = filename;

  const returnDomain = headers['x-zipline-domain'];
  if (returnDomain) response.overrides.returnDomain = returnDomain;

  return response;
}
