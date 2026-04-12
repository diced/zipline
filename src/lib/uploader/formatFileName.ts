import dayjs from 'dayjs';
import { config } from '../config';
import { Config } from '../config/validate';
import type { File } from '../db/models/file';
import type { User } from '../db/models/user';
import { parseString } from '../parser';
import type { parserMetrics } from '../parser/metrics';
import { randomCharacters } from '../random';
import { randomUUID } from 'crypto';
import { parse } from 'path';
import { randomWords } from './randomWords';
import { sanitizeFilename } from '../fs';

export type CustomFormatOptions = {
  customFormat: string | null;
  file: File;
  user: User;
  metrics: Awaited<ReturnType<typeof parserMetrics>> | null;
};

export function formatFileName(
  nameFormat: Config['files']['defaultFormat'],
  originalName?: string,
  customFormatOptions?: CustomFormatOptions,
) {
  switch (nameFormat) {
    case 'random':
      return randomCharacters(config.files.length);
    case 'date':
      return dayjs().format(config.files.defaultDateFormat);
    case 'uuid':
      return randomUUID({ disableEntropyCache: true });
    case 'name':
      const sanitized = originalName ? parse(originalName).name : null;
      if (!sanitized) return null;

      const { name } = parse(sanitized);
      return name;
    case 'random-words':
    case 'gfycat':
      return randomWords(config.files.randomWordsNumAdjectives, config.files.randomWordsSeparator);
    case 'custom':
      if (!customFormatOptions) throw new Error('customFormatOptions is required for custom format');
      if (!customFormatOptions.customFormat) return null;
      const parsedFormat = parseString(customFormatOptions.customFormat, {
        file: customFormatOptions.file,
        user: customFormatOptions.user,
        ...(customFormatOptions.metrics ?? {}),
      });
      if (!parsedFormat) return null;
      return sanitizeFilename(parsedFormat);
    default:
      return randomCharacters(config.files.length);
  }
}
