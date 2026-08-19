import { ApiError } from '@/lib/api/errors';
import {
  listSessions,
  removeOtherSessions,
  removeSession,
  type UserSession,
  userSessionSchema,
} from '@/lib/db/models/session';
import { log } from '@/lib/logger';
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
              current: userSessionSchema.nullable(),
              other: z.array(userSessionSchema),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const currentSession = await getSession(req, res);

        const currentDbSession = req.user.sessions.find((session) => session.id === currentSession.sessionId);

        return res.send({
          current: currentDbSession ?? null,
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
              current: userSessionSchema.nullable(),
              other: z.array(userSessionSchema),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const currentSession = await getSession(req, res);

        if (req.body.all) {
          await removeOtherSessions(req.user.id, currentSession.sessionId!);
          const sessions = await listSessions(req.user.id);

          logger.info('user logged out all logged in sessions', {
            user: req.user.username,
          });

          return res.send({
            current: sessions.find((session) => session.id === currentSession.sessionId)!,
            other: [],
          });
        }

        if (req.body.sessionId === currentSession.sessionId) throw new ApiError(1021);
        if (!req.user.sessions.find((session) => session.id === req.body.sessionId)) throw new ApiError(1031);

        await removeSession(req.user.id, req.body.sessionId!);
        const sessions = await listSessions(req.user.id);

        logger.info('user logged out of session', {
          user: req.user.username,
          session: req.body.sessionId,
        });

        return res.send({
          current: sessions.find((session) => session.id === currentSession.sessionId) ?? null,
          other: sessions.filter((session) => session.id !== currentSession.sessionId),
        });
      },
    );
  },
  { name: PATH },
);
