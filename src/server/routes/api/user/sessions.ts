import { prisma } from '@/lib/db';
import { userMiddleware } from '@/server/middleware/user';
import { getSession } from '@/server/session';
import fastifyPlugin from 'fastify-plugin';

export type ApiUserSessionsResponse = {
  current: string;
  other: string[];
};

type Body = {
  sessionId?: string;
  all?: boolean;
};

export const PATH = '/api/user/sessions';
export default fastifyPlugin(
  (server, _, done) => {
    server.get(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const currentSession = await getSession(req, res);

      return res.send({
        current: currentSession.sessionId,
        other: req.user.sessions.filter((session) => session !== currentSession.sessionId),
      });
    });

    server.delete<{ Body: Body }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
      const currentSession = await getSession(req, res);

      if (req.body.all) {
        await prisma.user.update({
          where: {
            id: req.user.id,
          },
          data: {
            sessions: {
              set: [currentSession.sessionId!],
            },
          },
        });

        return res.send({
          current: currentSession.sessionId,
          other: [],
        });
      }

      if (!req.body.sessionId) return res.badRequest('No session provided');
      if (req.body.sessionId === currentSession.sessionId)
        return res.badRequest('Cannot delete current session');
      if (!req.user.sessions.includes(req.body.sessionId))
        return res.badRequest('Session not found in logged in sessions');

      const sessionsWithout = req.user.sessions.filter((session) => session !== req.body.sessionId);

      await prisma.user.update({
        where: {
          id: req.user.id,
        },
        data: {
          sessions: {
            set: sessionsWithout,
          },
        },
      });

      return res.send({
        current: currentSession.sessionId,
        other: sessionsWithout,
      });
    });

    done();
  },
  { name: PATH },
);
