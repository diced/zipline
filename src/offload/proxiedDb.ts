import type { File, FileUpdate } from '@/lib/db/models/file';
import type {
  IncompleteFile,
  IncompleteFileInsert,
  IncompleteFileStatusValue,
} from '@/lib/db/models/incompleteFile';
import type { Thumbnail, ThumbnailInsert } from '@/lib/db/models/thumbnail';
import type { User } from '@/lib/db/models/user';
import { randomCharacters } from '@/lib/random';
import { parentPort } from 'worker_threads';

export type DomainDbCommands = {
  'incomplete.create': { payload: IncompleteFileInsert; result: IncompleteFile };
  'incomplete.increment': {
    payload: { id: string; status: IncompleteFileStatusValue };
    result: IncompleteFile | null;
  };
  'incomplete.status': {
    payload: { id: string; status: IncompleteFileStatusValue };
    result: IncompleteFile | null;
  };
  'file.finalizePartial': { payload: { id: string; changes: FileUpdate }; result: File | null };
  'file.delete': { payload: { id: string }; result: { id: string } | null };
  'user.uploadContext': { payload: { id: string }; result: User | null };
  'file.thumbnailSource': { payload: { id: string }; result: File | null };
  'thumbnail.byFile': { payload: { fileId: string }; result: Thumbnail | null };
  'thumbnail.create': { payload: ThumbnailInsert; result: Thumbnail };
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

export type DomainDbResponse = { type: 'db-response'; id: string; result: string };

const pending = new Map<string, (result: unknown) => void>();

parentPort?.on('message', (message: DomainDbResponse) => {
  if (message.type !== 'db-response') return;
  const resolve = pending.get(message.id);
  if (!resolve) return;
  try {
    resolve(JSON.parse(message.result));
  } catch (error) {
    resolve(null);
    console.error(error);
  }
  pending.delete(message.id);
});

export function dbProxy<C extends DomainDbCommand>(
  command: C,
  payload: DomainDbCommands[C]['payload'],
): Promise<DomainDbCommands[C]['result']> {
  return new Promise((resolve) => {
    const id = randomCharacters(32);
    pending.set(id, resolve as (result: unknown) => void);
    const request = { type: 'db', id, command, payload } as DomainDbRequest<C>;
    parentPort?.postMessage(request);
  });
}
