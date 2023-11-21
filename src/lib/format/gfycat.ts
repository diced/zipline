import { readFile } from 'fs/promises';
import config from 'lib/config';
import Logger from 'lib/logger';

const logger = Logger.get('random_words');

export type GfyCatWords = {
  adjectives: string[];
  animals: string[];
};

export async function importWords(): Promise<GfyCatWords | null> {
  try {
    const adjectives = (await readFile('public/adjectives.txt', 'utf-8')).split('\n').map((x) => x.trim());
    const animals = (await readFile('public/animals.txt', 'utf-8')).split('\n').map((x) => x.trim());

    return {
      adjectives,
      animals,
    };
  } catch {
    logger.error('public/adjectives.txt or public/animals.txt do not exist, to fix this please retrieve.');
    logger.error('to prevent this from happening again, remember to not delete your public/ directory.');
    logger.error('file names will use the RANDOM format instead until fixed');
    return null;
  }
}

function randomWord(words: string[]) {
  return words[Math.floor(Math.random() * words.length)];
}

export default async function gfycat(): Promise<string | null> {
  const words = await importWords();

  if (!words) return null;

  return `${randomWord(words.adjectives)}${config.uploader.random_words_separator}${randomWord(
    words.adjectives,
  )}${config.uploader.random_words_separator}${randomWord(words.animals)}`;
}
