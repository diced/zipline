import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import { config } from '../config';
import { Config } from '../config/validate';
import { getExtension, sanitizeFilename } from '../fs';
import { randomCharacters } from '../random';
import { randomWords } from './randomWords';

export function formatFileName(
  nameFormat: Config['files']['defaultFormat'],
  originalName?: string,
  dateIncrement?: number,
) {
  switch (nameFormat) {
    case 'random':
      return randomCharacters(config.files.length);
    case 'date':
      return dayjs().format(config.files.defaultDateFormat) + (dateIncrement ? `-${dateIncrement}` : '');
    case 'uuid':
      return randomUUID({ disableEntropyCache: true });
    case 'name':
      if (!originalName) return null;

      const sanitized = sanitizeFilename(originalName);
      if (!sanitized) return null;

      return sanitized.slice(0, sanitized.length - getExtension(sanitized).length);
    case 'random-words':
    case 'gfycat':
      return randomWords(config.files.randomWordsNumAdjectives, config.files.randomWordsSeparator);
    default:
      return randomCharacters(config.files.length);
  }
}
