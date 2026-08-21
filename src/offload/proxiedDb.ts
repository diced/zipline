import type { File, FileUpdate } from '@/lib/db/models/file';
import type { IncompleteFile, IncompleteFileStatusValue } from '@/lib/db/models/incompleteFile';
import type { User } from '@/lib/db/models/user';
import type { files, incompleteFiles, Thumbnail, thumbnails } from '@/lib/db/schema';
import { randomCharacters } from '@/lib/random';
import { parentPort } from 'worker_threads';

export type DomainDbCommands = {
  'incomplete.create': { payload: typeof incompleteFiles.$inferInsert; result: IncompleteFile };
  'incomplete.increment': {
    payload: { id: string; status: IncompleteFileStatusValue };
    result: IncompleteFile | null;
  };
  'incomplete.status': {
    payload: { id: string; status: IncompleteFileStatusValue };
    result: IncompleteFile | null;
  };
  'file.finalizePartial': {
    payload: { id: string; changes: FileUpdate };
    result: Omit<typeof files.$inferSelect, 'password' | 'userId'> | null;
  };
  'file.delete': { payload: { id: string }; result: { id: string } | null };
  'user.uploadContext': { payload: { id: string }; result: User | null };
  'file.thumbnailSource': { payload: { id: string }; result: File | null };
  'thumbnail.byFile': { payload: { fileId: string }; result: Thumbnail | null };
  'thumbnail.create': { payload: typeof thumbnails.$inferInsert; result: Thumbnail };
  'thumbnail.touch': { payload: { id: string; createdAt: Date }; result: Thumbnail | null };
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

export type DomainDbResponse = { type: 'db-response'; id: string; result: unknown };

const pending = new Map<string, (result: unknown) => void>();

parentPort?.on('message', (message: DomainDbResponse) => {
  if (message.type !== 'db-response') return;
  const resolve = pending.get(message.id);
  if (!resolve) return;
  resolve(message.result);
  pending.delete(message.id);
});

export function dbProxy<C extends DomainDbCommand>(
  command: C,
  payload: DomainDbCommands[C]['payload'],
): Promise<DomainDbCommands[C]['result']> {
  return new Promise((resolve) => {
    const id = randomCharacters(32);
    pending.set(id, resolve as (result: unknown) => void);
    parentPort?.postMessage({ type: 'db', id, command, payload });
  });
}
