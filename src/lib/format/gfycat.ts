import { readFile } from 'fs/promises';

export type GfyCatWords = {
  adjectives: string[];
  animals: string[];
};

export async function importWords(): Promise<GfyCatWords> {
  const adjectives = (await readFile('public/adjectives.txt', 'utf-8')).split('\n');
  const animals = (await readFile('public/animals.txt', 'utf-8')).split('\n');

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

  return `${randomWord(words.adjectives)}${randomWord(words.adjectives)}${randomWord(words.animals)}`;
}
