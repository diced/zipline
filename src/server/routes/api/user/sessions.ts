import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { UserSession, userSessionSchema } from '@/lib/db/models/user';
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
          description:
            'List the current browser session and other active sessions for the authenticated user.',
          response: {
            200: z.object({
              current: userSessionSchema,
              other: z.array(userSessionSchema),
            }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const currentSession = await getSession(req, res);

        const currentDbSession = req.user.sessions.find((session) => session.id === currentSession.sessionId);

        if (!currentDbSession) throw new ApiError(2000);

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
          description: 'Invalidate one or all other sessions for the authenticated user.',
          body: z.object({
            sessionId: z.string().optional(),
            all: z.boolean().optional(),
          }),
          response: {
            200: z.object({
              current: userSessionSchema,
              other: z.array(userSessionSchema),
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

        if (req.body.sessionId === currentSession.sessionId) throw new ApiError(1021);
        if (!req.user.sessions.find((session) => session.id === req.body.sessionId)) throw new ApiError(1031);

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
