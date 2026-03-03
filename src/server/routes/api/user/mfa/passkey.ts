import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { User } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { isTruthy } from '@/lib/primitive';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { TimedCache } from '@/lib/timedCache';
import { zStringTrimmed } from '@/lib/validation';
import { Prisma } from '@/prisma/client';
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
import z from 'zod';

export type ApiUserMfaPasskeyResponse = User | User['passkeys'];

const logger = log('api').c('user').c('mfa').c('passkey');

const passkeysEnabled = (): boolean =>
  isTruthy(config.mfa.passkeys.enabled, config.mfa.passkeys.rpID, config.mfa.passkeys.origin);

export const passkeysEnabledHandler = async (_: FastifyRequest, __: FastifyReply) => {
  if (!passkeysEnabled()) throw new ApiError(9002);
};

export type PasskeyReg = {
  webauthn: {
    webAuthnUserID: string;
    id: string;
    publicKey: string;
    counter: number;
    transports?: string[];
    deviceType?: string;
    backedUp?: boolean;
  };
};

const OPTIONS_CACHE = new TimedCache<string, PublicKeyCredentialCreationOptionsJSON>(3 * 60_000); // 3 min ttl

export const PATH = '/api/user/mfa/passkey';
export default typedPlugin(
  async (server) => {
    server.get(PATH, { preHandler: [userMiddleware, passkeysEnabledHandler] }, async (req, res) => {
      const passkeys = await prisma.userPasskey.findMany({
        where: {
          userId: req.user.id,
        },
        omit: {
          reg: true,
        },
      });

      return res.send(passkeys);
    });

    server.get(
      PATH + '/options',
      {
        schema: {
          description: 'Generate WebAuthn registration options for creating a new passkey.',
        },
        preHandler: [userMiddleware, passkeysEnabledHandler],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        if (OPTIONS_CACHE.has(req.user.id)) return res.send(OPTIONS_CACHE.get(req.user.id)!);

        const existingPasskeys = (await prisma.userPasskey.findMany({
          where: { userId: req.user.id },
          select: {
            reg: true,
          },
        })) as { reg: PasskeyReg | null }[];

        const options: PublicKeyCredentialCreationOptionsJSON = await generateRegistrationOptions({
          rpName: 'Zipline',
          rpID: config.mfa.passkeys.rpID!,

          userName: req.user.username,
          userID: new TextEncoder().encode(req.user.id),

          authenticatorSelection: {
            userVerification: 'preferred',
            residentKey: 'preferred',
          },

          excludeCredentials: existingPasskeys
            .filter((pk) => pk.reg?.webauthn && pk.reg.webauthn.id)
            .map(
              (pk) =>
                ({
                  id: pk.reg!.webauthn.id,
                  type: 'public-key',
                  transports: (pk.reg!.webauthn!.transports as AuthenticatorTransportFuture[]) ?? undefined,
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

        const user = await prisma.user.update({
          where: { id: req.user.id },
          data: {
            passkeys: {
              create: {
                name,
                reg: {
                  webauthn: {
                    webAuthnUserID: optionsCached.user.id,
                    id: verification.registrationInfo.credential.id,
                    publicKey: verification.registrationInfo.credential.publicKey,
                    counter: verification.registrationInfo.credential.counter,
                    transports: verification.registrationInfo.credential.transports,
                    deviceType: verification.registrationInfo.credentialDeviceType,
                    backedUp: verification.registrationInfo.credentialBackedUp,
                  },
                } as unknown as Prisma.InputJsonValue,
                lastUsed: new Date(),
              },
            },
          },
        });

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
        },
        preHandler: [userMiddleware, passkeysEnabledHandler],
      },
      async (req, res) => {
        const { id } = req.body;

        const user = await prisma.user.update({
          where: { id: req.user.id },
          data: {
            passkeys: {
              delete: { id },
            },
          },
        });

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
