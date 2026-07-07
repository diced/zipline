import { Worker, type WorkerOptions } from 'worker_threads';

export function workerUrl(pathFromRoot: string) {
  return new URL(pathFromRoot, new URL('../../build/', import.meta.url));
}

export function createWorker(pathFromRoot: string, options: WorkerOptions) {
  return new Worker(workerUrl(pathFromRoot), {
    ...options,
    type: 'module',
  } as WorkerOptions);
}
