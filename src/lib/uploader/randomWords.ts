import { readFileSync } from 'fs';
import fallbackAdjectives from './wordlists/adjectives';
import fallbackAnimals from './wordlists/animals';
import { log } from '../logger';
import { randomIndex } from '../random';

const logger = log('random_words');

function importWords(): {
  adjectives: string[];
  animals: string[];
} {
  try {
    const adjectives = readFileSync('./public/adjectives.txt', 'utf-8');
    const animals = readFileSync('./public/animals.txt', 'utf-8');

    return {
      adjectives: adjectives.split('\n'),
      animals: animals.split('\n'),
    };
  } catch (e) {
    logger.error((e as Error).message).debug('using fallback wordlists');

    return {
      adjectives: fallbackAdjectives,
      animals: fallbackAnimals,
    };
  }
}

export function randomWords(numAdjectives: number = 2, seperator: string = '-') {
  const { adjectives, animals } = importWords();

  let words = '';

  for (let i = 0; i !== numAdjectives; ++i) {
    words += adjectives[randomIndex(adjectives.length)] + seperator;
  }

  words += animals[randomIndex(animals.length)];

  return words;
}
