import { ApiError } from '@/lib/api/errors';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import { deleteOtherUserSessions } from '@/lib/db/models/session';
import {
  findFullUserById,
  findUserRowById,
  findUserRowByUsername,
  updateFullUser,
  type User,
  type UserUpdate,
  userSchema,
} from '@/lib/db/models/user';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import { getSession, saveSession } from '@/server/session';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserResponse = {
  user?: User;
};

const logger = log('api').c('user');

export const PATH = '/api/user';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Get the currently authenticated user and their token.',
          response: {
            200: z.object({
              user: userSchema.optional(),
              token: z.string().optional(),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        return res.send({ user: req.user, token: req.cookies.zipline_token });
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          description: "Update the current user's profile, credentials, avatar, and view settings.",
          body: z.object({
            username: zStringTrimmed.optional(),
            password: zStringTrimmed.optional(),
            currentPassword: z.string().optional(),
            avatar: z.string().nullish(),
            view: z
              .object({
                content: z.string().nullish(),
                embed: z.boolean().optional(),
                embedMediaOnly: z.boolean().optional(),
                embedTitle: z.string().nullish(),
                embedDescription: z.string().nullish(),
                embedColor: z.string().nullish(),
                embedSiteName: z.string().nullish(),
                enabled: z.boolean().optional(),
                disableTextFiles: z.boolean().optional(),
                align: z.enum(['left', 'center', 'right']).optional(),
                showMimetype: z.boolean().optional(),
                showTags: z.boolean().optional(),
                showFolder: z.boolean().optional(),
              })
              .partial()
              .optional(),
          }),
          response: {
            200: z.object({
              user: userSchema.optional(),
              token: z.string().optional(),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        if (req.body.username) {
          const existing = await findUserRowByUsername(req.body.username);

          if (existing) throw new ApiError(1038);
        }

        const changingPassword = !!req.body.password;
        if (changingPassword) {
          const passwdReq = await findUserRowById(req.user.id);

          if (!passwdReq) throw new ApiError(1068);

          if (passwdReq.password) {
            if (!req.body.currentPassword) throw new ApiError(1067);

            const valid = await verifyPassword(req.body.currentPassword, passwdReq.password);
            if (!valid) {
              logger.warn('invalid current password on password change', {
                user: req.user.username,
                ip: req.ip ?? 'unknown',
                ua: req.headers['user-agent'],
              });

              throw new ApiError(1066);
            }
          }
        }

        const currentSession = await getSession(req, res);

        const data: UserUpdate = {
          ...(req.body.username && { username: req.body.username }),
          ...(req.body.password && { password: await hashPassword(req.body.password) }),
          ...(req.body.avatar !== undefined && { avatar: req.body.avatar || null }),
          ...(req.body.view && {
            view: {
              ...req.user.view,
              ...(req.body.view.enabled !== undefined && { enabled: req.body.view.enabled || false }),
              ...(req.body.view.disableTextFiles !== undefined && {
                disableTextFiles: req.body.view.disableTextFiles || false,
              }),
              ...(req.body.view.content !== undefined && { content: req.body.view.content || null }),
              ...(req.body.view.embed !== undefined && { embed: req.body.view.embed || false }),
              ...(req.body.view.embedMediaOnly !== undefined && {
                embedMediaOnly: (() => {
                  const embedOn = !!(req.body.view.embed !== undefined
                    ? req.body.view.embed
                    : (req.user.view as { embed?: boolean }).embed);
                  return embedOn ? false : req.body.view.embedMediaOnly || false;
                })(),
              }),
              ...(req.body.view.embedTitle !== undefined && {
                embedTitle: req.body.view.embedTitle || null,
              }),
              ...(req.body.view.embedDescription !== undefined && {
                embedDescription: req.body.view.embedDescription || null,
              }),
              ...(req.body.view.embedColor !== undefined && {
                embedColor: req.body.view.embedColor || null,
              }),
              ...(req.body.view.embedSiteName !== undefined && {
                embedSiteName: req.body.view.embedSiteName || null,
              }),
              ...(req.body.view.align !== undefined && { align: req.body.view.align || 'center' }),
              ...(req.body.view.showMimetype !== undefined && {
                showMimetype: req.body.view.showMimetype || false,
              }),
              ...(req.body.view.showTags !== undefined && { showTags: req.body.view.showTags || false }),
              ...(req.body.view.showFolder !== undefined && {
                showFolder: req.body.view.showFolder || false,
              }),
            },
          }),
        };

        const user = changingPassword
          ? await db.transaction(async (tx) => {
              await deleteOtherUserSessions(req.user.id, currentSession.sessionId ?? '', tx);
              return updateFullUser(req.user.id, data, tx);
            })
          : Object.keys(data).length
            ? await updateFullUser(req.user.id, data)
            : await findFullUserById(req.user.id);
        if (!user) throw new ApiError(1068);

        await saveSession(currentSession, user, false);

        logger.info(`${req.user.username} updated their user`, {
          updated: Object.keys(req.body),
        });

        return res.send({ user, token: req.cookies.zipline_token });
      },
    );
  },
  { name: PATH },
);
