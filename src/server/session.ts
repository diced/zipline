import { config } from '@/lib/config';
import { User } from '@/lib/db/models/user';
import { FastifyReply, FastifyRequest } from 'fastify';
import { IncomingMessage, ServerResponse } from 'http';
import { getIronSession } from 'iron-session';

const cookieOptions = {
  // week
  maxAge: 60 * 60 * 24 * 7,
  expires: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000),
  path: '/',
  sameSite: 'lax',
};

export async function getSession(
  req: FastifyRequest | IncomingMessage,
  reply: FastifyReply | ServerResponse<IncomingMessage>,
) {
  if (!(req as any).raw || !(req as any).raw) {
    const session = await getIronSession<{ user: User | null }>(
      req as IncomingMessage,
      reply as ServerResponse<IncomingMessage>,
      {
        password: config.core.secret,
        cookieName: 'zipline_session',
        cookieOptions,
      },
    );

    return session;
  }

  const session = await getIronSession<{ user: User | null }>(
    (req as FastifyRequest).raw,
    (reply as FastifyReply).raw,
    {
      password: config.core.secret,
      cookieName: 'zipline_session',
      cookieOptions,
    },
  );

  return session;
}
