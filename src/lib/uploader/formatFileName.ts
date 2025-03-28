import dayjs from 'dayjs';
import { config } from '../config';
import { Config } from '../config/validate';
import { randomCharacters } from '../random';
import { randomUUID } from 'crypto';
import { parse } from 'path';
import { randomWords } from './randomWords';

export function formatFileName(nameFormat: Config['files']['defaultFormat'], originalName?: string) {
  switch (nameFormat) {
    case 'random':
      return randomCharacters(config.files.length);
    case 'date':
      return dayjs().format(config.files.defaultDateFormat);
    case 'uuid':
      return randomUUID({ disableEntropyCache: true });
    case 'name':
      const { name } = parse(originalName!);

      return name;
    case 'random-words':
    case 'gfycat':
      return randomWords(config.files.randomWordsNumAdjectives, config.files.randomWordsSeperator);
    default:
      return randomCharacters(config.files.length);
  }
}
