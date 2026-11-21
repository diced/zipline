import { config } from '@/lib/config';
import { decryptToken } from '@/lib/crypto';
import { db } from '@/lib/db';
import { getUser, getUserBySession, getUserByToken, type User } from '@/lib/db/models/user';
import { FastifyReply } from 'fastify';
import { FastifyRequest } from 'fastify/types/request';
import { getSession } from '../session';
import { ApiError } from '@/lib/api/errors';
import {
  apiKeyHashesMatch,
  type ApiKeyScope,
  hashApiKeyToken,
  parseApiKeyToken,
  requiredApiKeyScope,
} from '@/lib/apiKey';
import { apiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

declare module 'fastify' {
  export interface FastifyRequest {
    user: User;
    apiKey?: { id: string; scopes: ApiKeyScope[] };
    authentication: 'apiKey' | 'token' | 'session';
  }
}

export function parseUserToken(encryptedToken: string | undefined | null): string;
export function parseUserToken(encryptedToken: string | undefined | null, noThrow: true): string | null;
export function parseUserToken(
  encryptedToken: string | undefined | null,
  noThrow: boolean = false,
): string | null {
  if (!encryptedToken) {
    if (noThrow) return null;
    throw new ApiError(2001);
  }

  const decryptedToken = decryptToken(encryptedToken, config.core.secret);
  if (!decryptedToken) {
    if (noThrow) return null;
    throw new ApiError(2001);
  }

  const [date, token] = decryptedToken;
  if (isNaN(new Date(date).getTime())) {
    if (noThrow) return null;

    throw new ApiError(2001);
  }

  return token;
}

export async function userMiddleware(req: FastifyRequest, res: FastifyReply) {
  const path = req.url.toLowerCase().split('?')[0];
  const upload = ['/api/upload', '/api/upload/partial'].includes(path);
  const leanUpload = upload && !config.discord?.onUpload && !config.httpWebhook.onUpload;

  const anonFolderUpload =
    req.headers['x-zipline-folder'] &&
    upload &&
    !req.headers.authorization &&
    !req.cookies['zipline_session'];
  if (anonFolderUpload) return;

  const authorization = req.headers.authorization;

  if (authorization) {
    const parsedApiKey = parseApiKeyToken(authorization);
    if (parsedApiKey) {
      const apiKey = await db.query.apiKeys.findFirst({
        columns: {
          id: true,
          secretHash: true,
          scopes: true,
          expiresAt: true,
          revokedAt: true,
          userId: true,
        },
        where: { prefix: parsedApiKey.prefix },
      });

      if (
        !apiKey ||
        apiKey.revokedAt ||
        (apiKey.expiresAt && apiKey.expiresAt <= new Date()) ||
        !apiKeyHashesMatch(apiKey.secretHash, hashApiKeyToken(parsedApiKey.token))
      ) {
        throw new ApiError(2001);
      }

      const requiredScope = requiredApiKeyScope(req.method, path);
      if (!requiredScope || !apiKey.scopes.includes(requiredScope)) throw new ApiError(1072);

      const user = leanUpload
        ? await db.query.users.findFirst({
            columns: { id: true, username: true, role: true },
            where: { id: apiKey.userId },
            with: { quota: true },
          })
        : await getUser(apiKey.userId);
      if (!user) throw new ApiError(2001);

      await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id));
      req.user = user as User;
      req.apiKey = { id: apiKey.id, scopes: apiKey.scopes as ApiKeyScope[] };
      req.authentication = 'apiKey';
      return;
    }

    const token = parseUserToken(authorization);

    let user;
    if (leanUpload) {
      user = await db.query.users.findFirst({
        columns: { id: true, username: true, role: true },
        where: { token },
        with: { quota: true },
      });
    } else {
      user = await getUserByToken(token);
    }
    if (!user) throw new ApiError(2001);

    req.user = user as User;
    req.authentication = 'token';

    return;
  }

  const session = await getSession(req, res);
  if (session.tokenAuth) throw new ApiError(2004);

  if (!session.id || !session.sessionId) throw new ApiError(2000);

  let user;
  if (leanUpload) {
    user = await db.query.users.findFirst({
      columns: { id: true, username: true, role: true },
      where: { sessions: { id: session.sessionId } },
      with: { quota: true },
    });
  } else {
    user = await getUserBySession(session.sessionId);
  }
  if (!user) throw new ApiError(2001);

  req.user = user as User;
  req.authentication = 'session';
}

export async function sessionOnlyMiddleware(req: FastifyRequest) {
  if (req.authentication !== 'session') throw new ApiError(9001);
}
