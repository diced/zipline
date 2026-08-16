import { detectClient, ZiplineClient } from '@/lib/api/detect';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { randomCharacters } from '@/lib/random';
import { fastifyCookie } from '@fastify/cookie';
import { FastifyReply, FastifyRequest } from 'fastify';
import { IncomingMessage, ServerResponse } from 'http';
import { getIronSession, type SessionOptions } from 'iron-session';
import { parseUserToken } from './middleware/user';

const cookieOptions: NonNullable<SessionOptions['cookieOptions']> = {
  // 2 weeks
  maxAge: 60 * 60 * 24 * 14,
  expires: new Date(Date.now() + 60 * 60 * 24 * 14 * 1000),
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  // secure is set in below session functions based on config
};

export type ZiplineSession = {
  id: string | null;
  sessionId: string | null;
  client: ZiplineClient;

  pkceVerifier?: string;
  oauthState?: string;
  tokenAuth?: boolean;
};

export type ZiplineIronSession = Awaited<ReturnType<typeof getSession>>;

export async function getSession(
  req: FastifyRequest | IncomingMessage,
  reply: FastifyReply | ServerResponse<IncomingMessage>,
) {
  cookieOptions.secure = config.core.returnHttpsUrls;

  const rawReq = (req as FastifyRequest).raw || req;
  const rawRes = (reply as FastifyReply).raw || reply;

  const session = await getIronSession<ZiplineSession>(
    rawReq as IncomingMessage,
    rawRes as ServerResponse<IncomingMessage>,
    {
      password: config.core.secret,
      cookieName: 'zipline_session',
      cookieOptions,
    },
  );

  const headers = req.headers;
  session.client = detectClient(<Record<string, string>>headers);
  const cookies = fastifyCookie.parse(headers.cookie || '');

  if (headers['authorization'] && !cookies['zipline_session']) {
    const token = parseUserToken(headers['authorization'], true);

    if (token) session.tokenAuth = true;
  }

  return session;
}

export async function saveSession(
  session: ZiplineIronSession,
  user: { id: string } & Record<string, any>,
  overwriteSessions = true,
) {
  cookieOptions.secure = config.core.returnHttpsUrls;

  session.id = user.id;

  if (!session.client) {
    session.client = {
      client: 'unknown',
      device: 'unknown',
      ua: 'unknown',
    };
  }

  if (overwriteSessions || !session.sessionId) {
    const sessionId = randomCharacters(32);
    session.sessionId = sessionId;

    if (overwriteSessions) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          sessions: {
            set: [
              {
                id: sessionId,
                client: session.client.client,
                device: session.client.device,
                ua: session.client.ua,
              },
            ],
          },
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          sessions: {
            create: {
              id: sessionId,
              client: session.client.client,
              device: session.client.device,
              ua: session.client.ua,
            },
          },
        },
      });
    }
  }

  await session.save();
}
