import { readFile } from 'fs/promises';
import config from 'lib/config';

export type GfyCatWords = {
  adjectives: string[];
  animals: string[];
};

export async function importWords(): Promise<GfyCatWords> {
  const adjectives = (await readFile('public/adjectives.txt', 'utf-8')).split('\n').map((x) => x.trim());
  const animals = (await readFile('public/animals.txt', 'utf-8')).split('\n').map((x) => x.trim());

  return {
    adjectives,
    animals,
  };
}

function randomWord(words: string[]) {
  return words[Math.floor(Math.random() * words.length)];
}

export default async function gfycat() {
  const words = await importWords();

  return `${randomWord(words.adjectives)}${config.uploader.random_words_separator}${randomWord(
    words.adjectives
  )}${config.uploader.random_words_separator}${randomWord(words.animals)}`;
}
