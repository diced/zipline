import type { IncompleteFileStatus } from '@/lib/db/enums';
import type { FileUpdate } from '@/lib/db/models/file';
import type { User } from '@/lib/db/models/user';
import type { files, incompleteFiles, thumbnails } from '@/lib/db/schema';
import { randomCharacters } from '@/lib/random';
import { parentPort } from 'worker_threads';

export type DomainDbCommands = {
  'incomplete.create': { payload: typeof incompleteFiles.$inferInsert; result: { id: string } };
  'incomplete.increment': {
    payload: { id: string; status: IncompleteFileStatus };
    result: { id: string } | null;
  };
  'incomplete.status': {
    payload: { id: string; status: IncompleteFileStatus };
    result: { id: string } | null;
  };
  'file.finalizePartial': {
    payload: { id: string; changes: FileUpdate };
    result: Omit<typeof files.$inferSelect, 'password' | 'userId'> | null;
  };
  'file.delete': { payload: { id: string }; result: { id: string } | null };
  'user.uploadContext': { payload: { id: string }; result: User | null };
  'file.thumbnailSource': {
    payload: { id: string };
    result: Pick<typeof files.$inferSelect, 'id' | 'name' | 'type' | 'size'> | null;
  };
  'thumbnail.upsert': {
    payload: Pick<typeof thumbnails.$inferInsert, 'fileId' | 'path'>;
    result: Pick<typeof thumbnails.$inferSelect, 'id'>;
  };
};

export type DomainDbCommand = keyof DomainDbCommands;
export type DomainDbRequest<C extends DomainDbCommand = DomainDbCommand> = C extends DomainDbCommand
  ? {
      type: 'db';
      id: string;
      command: C;
      payload: DomainDbCommands[C]['payload'];
    }
  : never;

export type DomainDbError = {
  name: string;
  message: string;
  stack?: string;
};

export type DomainDbResponse =
  | { type: 'db-response'; id: string; ok: true; result: unknown }
  | { type: 'db-response'; id: string; ok: false; error: DomainDbError };

const pending = new Map<
  string,
  {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }
>();

parentPort?.on('message', (message: DomainDbResponse) => {
  if (message.type !== 'db-response') return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);

  if (message.ok) {
    request.resolve(message.result);
    return;
  }

  const error = new Error(message.error.message);
  error.name = message.error.name;
  if (message.error.stack) error.stack = message.error.stack;
  request.reject(error);
});

export function dbProxy<C extends DomainDbCommand>(
  command: C,
  payload: DomainDbCommands[C]['payload'],
): Promise<DomainDbCommands[C]['result']> {
  const port = parentPort;
  if (!port) return Promise.reject(new Error('Database proxy requires a worker parent port'));

  return new Promise((resolve, reject) => {
    const id = randomCharacters(32);
    pending.set(id, { resolve: resolve as (result: unknown) => void, reject });
    try {
      port.postMessage({ type: 'db', id, command, payload });
    } catch (error) {
      pending.delete(id);
      reject(error);
    }
  });
}
