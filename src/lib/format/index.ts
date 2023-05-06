import date from './date';
import gfycat from './gfycat';
import random from './random';
import uuid from './uuid';
import { parse } from 'path';

export type NameFormat = 'random' | 'date' | 'uuid' | 'name' | 'gfycat';
export const NameFormats: NameFormat[] = ['random', 'date', 'uuid', 'name', 'gfycat'];
export default async function formatFileName(nameFormat: NameFormat, originalName?: string) {
  switch (nameFormat) {
    case 'random':
      return random();
    case 'date':
      return date();
    case 'uuid':
      return uuid();
    case 'name':
      const { name } = parse(originalName);

      return name;
    case 'gfycat':
      return gfycat();
    default:
      return random();
  }
}
