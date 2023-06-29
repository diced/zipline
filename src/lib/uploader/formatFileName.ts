import dayjs from 'dayjs';
import { config } from '../config';
import { Config } from '../config/validate';
import { randomCharacters } from '../crypto';
import { randomUUID } from 'crypto';
import { parse } from 'path';

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
    case 'gfycat':
    default:
      return randomCharacters(config.files.length);
  }
}
