import { createAccessToken, getAccessTokenId } from '@/lib/accessToken';
import { ApiError } from '@/lib/api/errors';
import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { datasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import { lockFiles, removeFile } from '@/lib/db/models/file';
import { files, incompleteFiles } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import { createWorker } from '@/lib/worker';
import type { PartialWorkerData, PartialWorkerMessage } from '@/offload/partial';
import { and, eq, getColumns } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import { on } from 'events';
import { readdir, rm } from 'fs/promises';
import { join } from 'path';
import type { Worker } from 'worker_threads';

const logger = log('api').c('upload').c('partial');

export const PARTIAL_TIMEOUT = 30 * 60_000;
const MAX_PARTIALS = 4;
const { password: _password, userId: _userId, ...partialFileColumns } = getColumns(files);

type PartialCache = {
  length: number;
  folder: string | undefined;
  prefix: string;
  directory: string;
  actorKey: string;
  quotaUserId: string | null;
  total: number;
  finalized: boolean;
  token?: string;
  timeout?: NodeJS.Timeout;
};

const partialsCache = new Map<string, PartialCache>();
const claimedPartials = new WeakMap<FastifyRequest, { identifier: string; cache: PartialCache }>();

function partialActorKey(req: FastifyRequest, folder: string | undefined) {
  return req.user ? `user:${req.user.id}` : `anonymous:${folder ?? 'unknown'}:${req.ip}`;
}

export function claimPartial(req: FastifyRequest): boolean {
  const token = req.headers['x-zipline-p-token'] as string;
  const range = req.headers['content-range'] as string;
  const folder = req.headers['x-zipline-folder'] as string;

  if (!token || !range) return false;

  const identifier = getAccessTokenId(token, 'partial-upload');
  if (!identifier) return false;

  const cache = partialsCache.get(identifier);
  if (
    !cache ||
    cache.finalized ||
    cache.token !== token ||
    cache.actorKey !== partialActorKey(req, folder) ||
    cache.folder !== folder
  )
    return false;

  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(range);
  if (!match) return false;

  const [start, end, total] = match.slice(1).map(Number);
  if (
    ![start, end, total].every(Number.isSafeInteger) ||
    start <= 0 ||
    start !== cache.length ||
    end < start ||
    end >= total ||
    total !== cache.total
  )
    return false;

  cache.token = undefined;
  claimedPartials.set(req, { identifier, cache });
  resetPartialTimeout(identifier);

  return true;
}

function getPartialClaim(req: FastifyRequest) {
  const claim = claimedPartials.get(req);
  if (!claim || partialsCache.get(claim.identifier) !== claim.cache)
    throw new ApiError(1003, 'Partial upload token is invalid, expired, or already used');

  return claim;
}

export function getClaimedPartial(req: FastifyRequest) {
  const claim = getPartialClaim(req);
  if (claim.cache.finalized) throw new ApiError(1003, 'Partial upload has already been finalized');

  return claim;
}

export function completePartialChunk(req: FastifyRequest): string | undefined {
  const { identifier, cache } = getPartialClaim(req);
  if (!cache.finalized) {
    cache.token = createAccessToken({
      type: 'partial-upload',
      id: identifier,
      expiresIn: PARTIAL_TIMEOUT,
    });
    resetPartialTimeout(identifier);
  }

  claimedPartials.delete(req);

  return cache.token;
}

export async function cleanupClaimedPartial(req: FastifyRequest) {
  const claim = claimedPartials.get(req);
  if (!claim) return;

  claimedPartials.delete(req);
  if (claim.cache.finalized) return;

  await deletePartial(claim.identifier).catch((error) => {
    logger.warn('failed to clean up unsuccessful partial upload', { identifier: claim.identifier, error });
  });
}

function resetPartialTimeout(identifier: string) {
  const cache = partialsCache.get(identifier);
  if (!cache || cache.finalized) return;

  clearTimeout(cache.timeout);

  cache.timeout = setTimeout(() => {
    deletePartial(identifier).catch((error) => {
      logger.warn('failed to clean up inactive partial upload', { identifier, error });
    });
  }, PARTIAL_TIMEOUT);

  cache.timeout.unref();
}

export function createPartial(
  req: FastifyRequest,
  folder: string | undefined,
  quotaUserId: string | null,
  total: number,
) {
  const actorKey = partialActorKey(req, folder);
  if (activePartials(actorKey) >= MAX_PARTIALS) throw new ApiError(1003, 'Too many active partial uploads');

  const identifier = randomCharacters(8);
  const cache: PartialCache = {
    length: 0,
    folder,
    prefix: `zipline_partial_${identifier}_`,
    directory: config.core.tempDirectory,
    actorKey,
    quotaUserId,
    total,
    finalized: false,
  };

  partialsCache.set(identifier, cache);
  claimedPartials.set(req, { identifier, cache });
  resetPartialTimeout(identifier);
}

function activePartials(actorKey: string) {
  let count = 0;
  for (const partial of partialsCache.values()) {
    if (partial.actorKey === actorKey && ++count >= MAX_PARTIALS) return count;
  }

  return count;
}

export function quotaReservations(quotaUserId: string) {
  let size = 0;
  let count = 0;
  for (const partial of partialsCache.values()) {
    if (partial.quotaUserId !== quotaUserId || partial.finalized) continue;

    size += partial.total;
    count++;
  }

  return { size, files: count };
}

export async function deletePartial(identifier: string) {
  const cache = partialsCache.get(identifier);
  if (!cache) return;

  partialsCache.delete(identifier);
  clearTimeout(cache.timeout);

  const tempFiles = await readdir(cache.directory);
  await Promise.all(
    tempFiles
      .filter((file) => file.startsWith(cache.prefix))
      .map((file) => rm(join(cache.directory, file), { force: true })),
  );
}

export async function deleteOrphanedPartialFiles() {
  const tempFiles = await readdir(config.core.tempDirectory);
  const orphaned = tempFiles.filter((file) => {
    if (!file.startsWith('zipline_partial_')) return false;

    return !partialsCache.has(file.split('_')[2]);
  });

  await Promise.all(orphaned.map((file) => rm(join(config.core.tempDirectory, file), { force: true })));

  if (orphaned.length) logger.info('cleaned up orphaned partial uploads', { files: orphaned.length });
}

type UploadedFile = Omit<typeof files.$inferSelect, 'password' | 'userId'>;

export async function runPartialUpload(
  req: FastifyRequest,
  {
    file,
    incompleteFileId,
    deletesAt,
    onComplete,
  }: {
    file: Pick<UploadedFile, 'id' | 'name' | 'type'>;
    incompleteFileId: string;
    deletesAt: Date | null;
    onComplete: (file: UploadedFile) => void | Promise<void>;
  },
) {
  let identifier: string | undefined;
  try {
    const claim = getClaimedPartial(req);
    const { cache } = claim;
    identifier = claim.identifier;

    const temporaryPath = join(cache.directory, `${cache.prefix}combined`);
    const partSize = bytes(config.chunks.size);
    cache.finalized = true;
    clearTimeout(cache.timeout);
    cache.timeout = undefined;

    const worker = createWorker('offload/partial.js', {
      workerData: {
        file: { name: file.name, type: file.type },
        directory: cache.directory,
        identifier,
        size: cache.total,
        temporaryPath,
        removeGpsMetadata: config.files.removeGpsMetadata,
        enabled: config.chunks.enabled,
      } satisfies PartialWorkerData,
    });

    void finish(worker, temporaryPath, partSize);
  } catch (error) {
    await fail(error);
    await cleanup();
    throw error;
  }

  async function finish(worker: Worker, temporaryPath: string, partSize: number) {
    let uploaded: UploadedFile;
    try {
      const size = await waitForPartialUpload(worker, incompleteFileId);
      uploaded = await db.transaction(async (tx) => {
        await lockFiles(tx);

        const where = and(eq(files.id, file.id), eq(files.name, file.name));
        const [reserved] = await tx.select({ id: files.id }).from(files).where(where).limit(1);
        if (!reserved) throw new Error('Partial upload file was removed or renamed');

        await datasource.put(file.name, temporaryPath, { mimetype: file.type, partSize });

        const [updated] = await tx
          .update(files)
          .set({ size, deletesAt })
          .where(where)
          .returning(partialFileColumns);
        if (!updated) throw new Error('Partial upload file no longer exists');

        await tx
          .update(incompleteFiles)
          .set({ status: 'COMPLETE', chunksComplete: incompleteFiles.chunksTotal })
          .where(eq(incompleteFiles.id, incompleteFileId));
        return updated;
      });
    } catch (error) {
      await worker.terminate().catch((error) => {
        logger.warn('failed to stop partial upload worker', { id: file.id, error });
      });
      await fail(error);
      return;
    } finally {
      await cleanup();
    }

    try {
      await onComplete(uploaded);
    } catch (error) {
      logger.error('failed to notify partial upload completion', { id: file.id, error });
    }
  }

  async function fail(error: unknown) {
    logger.error('partial upload failed', {
      id: file.id,
      error: error instanceof Error ? error.message : error,
    });

    await db
      .transaction(async (tx) => {
        await lockFiles(tx);

        const [reserved] = await tx
          .select({ name: files.name })
          .from(files)
          .where(eq(files.id, file.id))
          .limit(1);
        if (reserved?.name === file.name) {
          try {
            await datasource.delete(file.name);
            await removeFile(file.id, tx);
          } catch (error) {
            logger.error('failed to remove unsuccessful partial upload', { id: file.id, error });
          }
        }

        await tx
          .update(incompleteFiles)
          .set({ status: 'FAILED' })
          .where(eq(incompleteFiles.id, incompleteFileId));
      })
      .catch((error) => {
        logger.error('failed to update unsuccessful partial upload', { id: file.id, error });
      });
  }

  async function cleanup() {
    if (!identifier) return;

    await deletePartial(identifier).catch((error) => {
      logger.warn('failed to clean up partial upload', { id: file.id, error });
    });
  }
}

async function waitForPartialUpload(worker: Worker, incompleteFileId: string): Promise<number> {
  // Keep late worker errors handled after the iterator receives the completed file.
  worker.on('error', (error) => {
    logger.warn('partial upload worker failed', { error: error instanceof Error ? error.message : error });
  });

  const messages = on(worker, 'message', { close: ['exit'] }) as AsyncIterable<[PartialWorkerMessage]>;
  for await (const [message] of messages) {
    if (message.type === 'complete') return message.size;
    if (message.type === 'failure') throw new Error(message.error);

    await db
      .update(incompleteFiles)
      .set(
        message.type === 'started'
          ? { chunksTotal: message.chunksTotal, status: 'PROCESSING' }
          : { chunksComplete: message.chunksComplete },
      )
      .where(eq(incompleteFiles.id, incompleteFileId));
  }

  throw new Error('Partial upload worker exited before completion');
}
