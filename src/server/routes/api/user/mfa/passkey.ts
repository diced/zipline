import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { db } from '@/lib/db';
import { passkeyRegSchema, userPasskeySchema } from '@/lib/db/models/passkey';
import { getUser, type User, userSchema } from '@/lib/db/models/user';
import { userPasskeys } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { isTruthy } from '@/lib/primitive';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { TimedCache } from '@/lib/timedCache';
import { zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import {
  AuthenticatorTransportFuture,
  generateRegistrationOptions,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialDescriptorJSON,
  RegistrationResponseJSON,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq } from 'drizzle-orm';
import z from 'zod';

export type ApiUserMfaPasskeyResponse = User | User['passkeys'];

const logger = log('api').c('user').c('mfa').c('passkey');

const passkeysEnabled = (): boolean =>
  isTruthy(config.mfa.passkeys.enabled, config.mfa.passkeys.rpID, config.mfa.passkeys.origin);

export const passkeysEnabledHandler = async (_: FastifyRequest, __: FastifyReply) => {
  if (!passkeysEnabled()) throw new ApiError(9002);
};

const OPTIONS_CACHE = new TimedCache<string, PublicKeyCredentialCreationOptionsJSON>(3 * 60_000);

export const PATH = '/api/user/mfa/passkey';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'List all registered passkey credentials for the authenticated user.',
          response: {
            200: z.array(userPasskeySchema.omit({ reg: true })),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware, passkeysEnabledHandler],
      },
      async (req, res) => {
        const passkeys = await db.query.userPasskeys.findMany({
          columns: { reg: false },
          where: eq(userPasskeys.userId, req.user.id),
        });

        return res.send(passkeys);
      },
    );

    server.get(
      PATH + '/options',
      {
        schema: {
          description: 'Generate WebAuthn registration options for creating a new passkey.',
          tags: ['auth'],
        },
        preHandler: [userMiddleware, passkeysEnabledHandler],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        if (OPTIONS_CACHE.has(req.user.id)) return res.send(OPTIONS_CACHE.get(req.user.id)!);

        const registrations = await db.query.userPasskeys.findMany({
          columns: { reg: true },
          where: eq(userPasskeys.userId, req.user.id),
        });
        const existingPasskeys = registrations.flatMap((passkey) => {
          const parsed = passkeyRegSchema.safeParse(passkey.reg);
          return parsed.success ? [parsed.data] : [];
        });

        const options: PublicKeyCredentialCreationOptionsJSON = await generateRegistrationOptions({
          rpName: 'Zipline',
          rpID: config.mfa.passkeys.rpID!,

          userName: req.user.username,
          userID: new TextEncoder().encode(req.user.id),

          authenticatorSelection: {
            userVerification: 'preferred',
            residentKey: 'preferred',
          },

          excludeCredentials: existingPasskeys.map(
            ({ webauthn }) =>
              ({
                id: webauthn.id,
                type: 'public-key',
                transports: (webauthn.transports as AuthenticatorTransportFuture[]) ?? undefined,
              }) satisfies PublicKeyCredentialDescriptorJSON,
          ),
        });

        OPTIONS_CACHE.set(req.user.id, options);

        return res.send(options);
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description: 'Register a new WebAuthn passkey for the authenticated user.',
          body: z.object({
            response: z
              .custom<RegistrationResponseJSON>()
              .describe('The registration response from the client, containing the new passkey credential.'),
            name: zStringTrimmed,
          }),
          response: {
            200: userSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware, passkeysEnabledHandler],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        const { response, name } = req.body;

        const optionsCached = OPTIONS_CACHE.get(req.user.id);
        if (!optionsCached) throw new ApiError(1048);

        OPTIONS_CACHE.delete(req.user.id);

        let verification;
        try {
          verification = await verifyRegistrationResponse({
            response: response,
            expectedChallenge: optionsCached.challenge,
            expectedRPID: optionsCached.rp.id!,
            expectedOrigin: config.mfa.passkeys.origin!,
          });
        } catch (e) {
          console.error(e);
          logger.warn('error verifying passkey registration');
          throw new ApiError(1049);
        }

        if (!verification.verified) throw new ApiError(1050);

        const user = await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(userPasskeys)
            .values({
              userId: req.user.id,
              name,
              reg: {
                webauthn: {
                  webAuthnUserID: optionsCached.user.id,
                  id: verification.registrationInfo.credential.id,
                  publicKey: Buffer.from(verification.registrationInfo.credential.publicKey).toString(
                    'base64',
                  ),
                  counter: verification.registrationInfo.credential.counter,
                  transports: verification.registrationInfo.credential.transports,
                  deviceType: verification.registrationInfo.credentialDeviceType,
                  backedUp: verification.registrationInfo.credentialBackedUp,
                },
              },
              lastUsed: new Date(),
            })
            .returning({ id: userPasskeys.id });
          if (!created) throw new Error('Passkey insert did not return a row');

          return getUser(req.user.id, tx);
        });
        if (!user) throw new ApiError(2001);

        logger.info('user created a new passkey', {
          user: user.username,
          name,
        });

        return res.send(user);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          description: 'Remove an existing passkey credential from your account.',
          body: z.object({
            id: z.string(),
          }),
          response: {
            200: userSchema,
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware, passkeysEnabledHandler],
      },
      async (req, res) => {
        const { id } = req.body;

        const user = await db.transaction(async (tx) => {
          const [deleted] = await tx
            .delete(userPasskeys)
            .where(and(eq(userPasskeys.userId, req.user.id), eq(userPasskeys.id, id)))
            .returning({ id: userPasskeys.id });
          if (!deleted) throw new Error(`Passkey ${id} does not belong to user ${req.user.id}`);
          return getUser(req.user.id, tx);
        });
        if (!user) throw new ApiError(2001);

        logger.info('user deleted a passkey', {
          user: user.username,
          id,
        });

        return res.send(user);
      },
    );
  },
  { name: PATH },
);
