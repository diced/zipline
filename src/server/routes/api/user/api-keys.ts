import { apiKeyScopeSchema, createApiKeyToken } from '@/lib/apiKey';
import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db';
import { apiKeySchema, type ApiKey } from '@/lib/db/models/apiKey';
import { apiKeys } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { zStringTrimmed } from '@/lib/validation';
import { sessionOnlyMiddleware, userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

export type ApiUserApiKeysResponse = ApiKey[] | (ApiKey & { token: string });

const logger = log('api').c('user').c('api-keys');
export const PATH = '/api/user/api-keys';

export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List API keys for the current browser session.',
          response: { 200: z.array(apiKeySchema) },
          tags: ['auth'],
        },
        preHandler: [userMiddleware, sessionOnlyMiddleware],
      },
      async (req, res) => {
        const keys = await db
          .select({
            id: apiKeys.id,
            createdAt: apiKeys.createdAt,
            updatedAt: apiKeys.updatedAt,
            name: apiKeys.name,
            prefix: apiKeys.prefix,
            scopes: apiKeys.scopes,
            expiresAt: apiKeys.expiresAt,
            lastUsedAt: apiKeys.lastUsedAt,
            revokedAt: apiKeys.revokedAt,
          })
          .from(apiKeys)
          .where(eq(apiKeys.userId, req.user.id))
          .orderBy(desc(apiKeys.createdAt));

        return res.send(keys);
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Create an API key. The token is returned only once.',
          body: z.object({
            name: zStringTrimmed.min(1).max(80),
            scopes: z
              .array(apiKeyScopeSchema)
              .min(1)
              .refine((scopes) => new Set(scopes).size === scopes.length),
            expiresAt: z.coerce
              .date()
              .refine((date) => date > new Date(), 'Expiration must be in the future.')
              .nullable()
              .optional(),
          }),
          response: { 200: apiKeySchema.extend({ token: z.string() }) },
          tags: ['auth'],
        },
        preHandler: [userMiddleware, sessionOnlyMiddleware],
      },
      async (req, res) => {
        const generated = createApiKeyToken();
        const [created] = await db
          .insert(apiKeys)
          .values({
            userId: req.user.id,
            name: req.body.name,
            scopes: req.body.scopes,
            expiresAt: req.body.expiresAt,
            prefix: generated.prefix,
            secretHash: generated.secretHash,
          })
          .returning();
        if (!created) throw new ApiError(9005);

        logger.info('user created an API key', {
          user: req.user.id,
          apiKey: created.id,
          scopes: created.scopes,
        });

        const { secretHash: _secretHash, userId: _userId, ...key } = created;
        return res.send({ ...key, token: generated.token });
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description: 'Revoke an API key owned by the current user.',
          body: z.object({ id: z.string() }),
          response: { 200: apiKeySchema },
          tags: ['auth'],
        },
        preHandler: [userMiddleware, sessionOnlyMiddleware],
      },
      async (req, res) => {
        const [revoked] = await db
          .update(apiKeys)
          .set({ revokedAt: new Date() })
          .where(and(eq(apiKeys.id, req.body.id), eq(apiKeys.userId, req.user.id), isNull(apiKeys.revokedAt)))
          .returning();
        if (!revoked) throw new ApiError(1071);

        logger.info('user revoked an API key', { user: req.user.id, apiKey: revoked.id });
        const { secretHash: _secretHash, userId: _userId, ...key } = revoked;
        return res.send(key);
      },
    );
  },
  { name: PATH },
);
