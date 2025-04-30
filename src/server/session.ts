import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { randomCharacters } from '@/lib/random';
import { FastifyReply, FastifyRequest } from 'fastify';
import { IncomingMessage, ServerResponse } from 'http';
import { getIronSession, type SessionOptions } from 'iron-session';

export type ZiplineSession = {
  id: string | null;
  sessionId: string | null;
};

export function computeCookieOptions(): SessionOptions['cookieOptions'] {
  const loginDuration = config.login.loginDuration;

  return {
    maxAge: 60 * 60 * 24 * loginDuration,
    expires: new Date(Date.now() + 60 * 60 * 24 * loginDuration * 1000),
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    secure: false,
  };
}

export async function getSession(
  req: FastifyRequest | IncomingMessage,
  reply: FastifyReply | ServerResponse<IncomingMessage>,
) {
  if (!(req as any).raw || !(req as any).raw) {
    const session = await getIronSession<ZiplineSession>(
      req as IncomingMessage,
      reply as ServerResponse<IncomingMessage>,
      {
        password: config.core.secret,
        cookieName: 'zipline_session',
        cookieOptions: computeCookieOptions(),
      },
    );

    return session;
  }

  const session = await getIronSession<ZiplineSession>(
    (req as FastifyRequest).raw,
    (reply as FastifyReply).raw,
    {
      password: config.core.secret,
      cookieName: 'zipline_session',
      cookieOptions: computeCookieOptions(),
    },
  );

  return session;
}

export async function saveSession(
  session: Awaited<ReturnType<typeof getSession>>,
  user: { id: string } & Record<string, any>,
  overwriteSessions = true,
) {
  session.id = user.id;

  const sessionId = randomCharacters(32);
  session.sessionId = sessionId;

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      sessions: overwriteSessions ? { set: [sessionId] } : { push: sessionId },
    },
  });

  await session.save();
}
