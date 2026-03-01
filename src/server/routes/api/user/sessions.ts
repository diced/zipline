import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import type { UserSession } from '@/prisma/client';
import { userMiddleware } from '@/server/middleware/user';
import { getSession } from '@/server/session';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserSessionsResponse = {
  current: UserSession;
  other: UserSession[];
};
const logger = log('api').c('user').c('sessions');

export const PATH = '/api/user/sessions';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          response: {
            200: z.object({
              current: z.any(),
              other: z.array(z.any()),
            }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const currentSession = await getSession(req, res);

        const currentDbSession = req.user.sessions.find((session) => session.id === currentSession.sessionId);

        if (!currentDbSession) return res.unauthorized('invalid login session');

        return res.send({
          current: currentDbSession,
          other: req.user.sessions.filter((session) => session.id !== currentSession.sessionId),
        });
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          body: z.object({
            sessionId: z.string().optional(),
            all: z.boolean().optional(),
          }),
          response: {
            200: z.object({
              current: z.any(),
              other: z.array(z.any()),
            }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const currentSession = await getSession(req, res);

        if (req.body.all) {
          const user = await prisma.user.update({
            where: {
              id: req.user.id,
            },
            data: {
              sessions: {
                deleteMany: {
                  NOT: {
                    id: currentSession.sessionId!,
                  },
                },
              },
            },
            include: {
              sessions: true,
            },
          });

          logger.info('user logged out all logged in sessions', {
            user: req.user.username,
          });

          return res.send({
            current: user.sessions.find((session) => session.id === currentSession.sessionId)!,
            other: [],
          });
        }

        if (req.body.sessionId === currentSession.sessionId)
          return res.badRequest('Cannot delete current session, use log out instead.');
        if (!req.user.sessions.find((session) => session.id === req.body.sessionId))
          return res.badRequest('Session not found in logged in sessions');

        const user = await prisma.user.update({
          where: {
            id: req.user.id,
          },
          data: {
            sessions: {
              delete: {
                id: req.body.sessionId,
              },
            },
          },
          include: {
            sessions: true,
          },
        });

        logger.info('user logged out of session', {
          user: req.user.username,
          session: req.body.sessionId,
        });

        return res.send({
          current: user.sessions.find((session) => session.id === currentSession.sessionId)!,
          other: user.sessions.filter((session) => session.id !== currentSession.sessionId),
        });
      },
    );
  },
  { name: PATH },
);
