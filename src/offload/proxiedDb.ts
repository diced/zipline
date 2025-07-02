import { randomCharacters } from '@/lib/random';
import { parentPort } from 'worker_threads';

export const pending: Record<string, (result: any) => void> = {};

parentPort?.on('message', (message) => {
  if (message.type === 'response') {
    const { id, result } = message;
    if (pending[id]) {
      try {
        pending[id](JSON.parse(result));
      } catch (e) {
        pending[id](null);
        console.error(e);
      }
      delete pending[id];
    }
  }
});

export function dbProxy<T>(query: string, data: any): Promise<T> {
  return new Promise((resolve) => {
    const id = randomCharacters(32);
    pending[id] = resolve;

    parentPort?.postMessage({
      type: 'query',
      id,
      query,
      data,
    });
  });
}
