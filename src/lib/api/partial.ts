import { createAccessToken, getAccessTokenId } from '@/lib/accessToken';
import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { log } from '@/lib/logger';
import { randomCharacters } from '@/lib/random';
import type { UploadOptions } from '@/lib/uploader/parseHeaders';
import type { FastifyRequest } from 'fastify';
import { readdir, rm } from 'fs/promises';
import { join } from 'path';

const logger = log('api').c('upload').c('partial');

export const PARTIAL_TIMEOUT = 30 * 60_000;
const MAX_PARTIALS = 4;

type PartialCache = {
  length: number;
  options: UploadOptions;
  prefix: string;
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
    cache.options.folder !== folder
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

export function finalizePartial(req: FastifyRequest) {
  const { cache } = getClaimedPartial(req);
  cache.finalized = true;
  if (cache.timeout) clearTimeout(cache.timeout);
  cache.timeout = undefined;
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

  if (cache.timeout) clearTimeout(cache.timeout);
  cache.timeout = setTimeout(() => {
    void deletePartial(identifier).catch((error) => {
      logger.warn('failed to clean up inactive partial upload', { identifier, error });
    });
  }, PARTIAL_TIMEOUT);
  cache.timeout.unref();
}

export function createPartial(
  req: FastifyRequest,
  options: UploadOptions,
  quotaUserId: string | null,
  total: number,
) {
  const actorKey = partialActorKey(req, options.folder);
  if (activePartials(actorKey) >= MAX_PARTIALS) throw new ApiError(1003, 'Too many active partial uploads');

  const identifier = randomCharacters(8);
  const cache: PartialCache = {
    length: 0,
    options,
    prefix: `zipline_partial_${identifier}_`,
    actorKey,
    quotaUserId,
    total,
    finalized: false,
  };

  partialsCache.set(identifier, cache);
  claimedPartials.set(req, { identifier, cache });
  resetPartialTimeout(identifier);

  return identifier;
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

export async function deletePartial(identifier: string, deleteFiles = true) {
  const cache = partialsCache.get(identifier);
  if (!cache) return;

  partialsCache.delete(identifier);
  if (cache.timeout) clearTimeout(cache.timeout);

  if (deleteFiles) {
    const tempFiles = await readdir(config.core.tempDirectory);
    await Promise.all(
      tempFiles.filter((f) => f.startsWith(cache.prefix)).map((f) => rm(join(config.core.tempDirectory, f))),
    );
  }
}

export async function deleteOrphanedPartialFiles() {
  const tempFiles = await readdir(config.core.tempDirectory);
  const orphaned = tempFiles.filter((file) => {
    if (!file.startsWith('zipline_partial_')) return false;

    for (const partial of partialsCache.values()) {
      if (file.startsWith(partial.prefix)) return false;
    }

    return true;
  });

  await Promise.all(orphaned.map((file) => rm(join(config.core.tempDirectory, file), { force: true })));

  if (orphaned.length) logger.info('cleaned up orphaned partial uploads', { files: orphaned.length });
}
