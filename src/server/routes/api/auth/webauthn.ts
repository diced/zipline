import { ApiError } from '@/lib/api/errors';
import { ziplineClientParseSchema } from '@/lib/api/detect';
import { config } from '@/lib/config';
import { createToken } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { User, userSelect } from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { TimedCache } from '@/lib/timedCache';
import { getSession, saveSession } from '@/server/session';
import typedPlugin from '@/server/typedPlugin';
import { JsonObject } from '@prisma/client/runtime/client';
import { AuthenticationResponseJSON } from '@simplewebauthn/browser';
import {
  generateAuthenticationOptions,
  PublicKeyCredentialRequestOptionsJSON,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import z from 'zod';
import { PasskeyReg, passkeysEnabledHandler } from '../user/mfa/passkey';

export type ApiAuthWebauthnResponse = {
  user: User;
};

export type ApiAuthWebauthnOptionsResponse = {
  id: string;
  options: PublicKeyCredentialRequestOptionsJSON;
};

const logger = log('api').c('auth').c('webauthn');

const OPTIONS_CACHE = new TimedCache<string, PublicKeyCredentialRequestOptionsJSON>(2 * 60_000);

export const PATH = '/api/auth/webauthn';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH + '/options',
      {
        schema: {
          description: 'Generate WebAuthn authentication options for logging in with an existing passkey.',
          response: {
            200: z.custom<ApiAuthWebauthnOptionsResponse>(),
          },
        },
        preHandler: [passkeysEnabledHandler],
        ...secondlyRatelimit(20),
      },
      async (req, res) => {
        if (req.cookies['webauthn-challenge-id']) {
          const existing = OPTIONS_CACHE.get(req.cookies['webauthn-challenge-id']);
          if (existing)
            return res.send({
              id: req.cookies['webauthn-challenge-id'],
              options: existing,
            });
        }

        const options = await generateAuthenticationOptions({
          rpID: config.mfa.passkeys.rpID!,
          userVerification: 'preferred',
        });

        const id = createToken();
        res.setCookie('webauthn-challenge-id', id, {
          expires: new Date(Date.now() + 2 * 60_000),
          httpOnly: true,
          secure: config.core.returnHttpsUrls,
          sameSite: 'lax',
        });
        OPTIONS_CACHE.set(id, options);

        return res.send({
          id,
          options,
        });
      },
    );

    server.post(
      PATH,
      {
        schema: {
          description:
            'Verify a WebAuthn authentication response and log in the user associated with the matching passkey.',
          body: z.object({
            response: z.custom<AuthenticationResponseJSON>(),
          }),
          headers: z.object({
            'x-zipline-client': ziplineClientParseSchema.optional(),
          }),
        },
        preHandler: [passkeysEnabledHandler],
        ...secondlyRatelimit(10),
      },
      async (req, res) => {
        const session = await getSession(req, res);

        const webauthnChallengeId = req.cookies['webauthn-challenge-id'];
        if (!webauthnChallengeId) throw new ApiError(1046);

        const { response } = req.body;
        if (!response) throw new ApiError(1047);

        const cachedOptions = OPTIONS_CACHE.get(webauthnChallengeId);
        if (!cachedOptions) throw new ApiError(1048);

        const user = await prisma.user.findFirst({
          where: {
            passkeys: {
              some: {
                reg: {
                  path: ['webauthn', 'id'],
                  equals: response.id,
                },
              },
            },
          },
          select: {
            ...userSelect,
            password: true,
            token: true,
          },
        });
        if (!user) {
          logger.warn('invalid webauthn attempt', {
            req: webauthnChallengeId,
          });
          logger.debug('invalid webauthn attempt', {
            request: response,
          });

          throw new ApiError(1052);
        }

        const passkey = user.passkeys.find((pk) => {
          const webauthn = (pk?.reg as JsonObject).webauthn as { id: string };
          if (!webauthn) return false;
          return webauthn.id === response.id;
        });

        if (!passkey) throw new ApiError(1052);
        const reg = passkey.reg as PasskeyReg;

        if (!reg.webauthn) {
          logger.debug('invalid webauthn attempt, legacy passkey found...');
          throw new ApiError(1060);
        }

        OPTIONS_CACHE.delete(webauthnChallengeId);

        let verification;
        try {
          verification = await verifyAuthenticationResponse({
            response: response,
            expectedChallenge: cachedOptions.challenge,
            expectedRPID: cachedOptions.rpId!,
            expectedOrigin: config.mfa.passkeys.origin!,
            credential: {
              id: reg.webauthn.id,
              counter: reg.webauthn.counter,
              publicKey: new Uint8Array(Buffer.from(reg.webauthn.publicKey, 'base64')),
            },
          });
        } catch (e) {
          console.error(e);
          logger.warn('error verifying passkey authentication');
          throw new ApiError(1051);
        }

        if (!verification.verified) {
          logger.warn('failed passkey authentication attempt', {
            user: user.username,
          });
          throw new ApiError(1052);
        }

        const { newCounter } = verification.authenticationInfo;

        await saveSession(session, user, false);

        delete (user as any).password;

        await prisma.userPasskey.update({
          where: {
            id: passkey.id,
          },
          data: {
            lastUsed: new Date(),
            reg: { webauthn: { ...reg.webauthn, counter: newCounter } },
          },
        });

        logger.info('user logged in with passkey', {
          user: user.username,
          passkey: passkey.name,
        });

        return res.send({
          user,
        });
      },
    );
  },
  { name: PATH },
);
