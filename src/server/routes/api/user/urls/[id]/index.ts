import { hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { Url, urlSchema } from '@/lib/db/models/url';
import { log } from '@/lib/logger';
import { zStringTrimmed } from '@/lib/validation';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiUserUrlsIdResponse = Url;

const logger = log('api').c('user').c('urls').c('[id]');

const paramsSchema = z.object({
  id: z.string(),
});

export const PATH = '/api/user/urls/:id';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          params: paramsSchema,
          response: {
            200: urlSchema.omit({ password: true }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const url = await prisma.url.findFirst({
          where: {
            id: id,
            userId: req.user.id,
          },
          omit: {
            password: true,
          },
        });
        if (!url) return res.notFound();

        return res.send(url);
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          params: paramsSchema,
          body: z.object({
            password: z.string().nullish(),
            vanity: zStringTrimmed.nullish(),
            maxViews: z.number().min(0).nullish(),
            destination: z.httpUrl().optional(),
            enabled: z.boolean().optional(),
          }),
          response: {
            200: urlSchema.omit({ password: true }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const url = await prisma.url.findFirst({
          where: {
            id: id,
            userId: req.user.id,
          },
        });

        if (!url) return res.notFound();

        let password: string | null | undefined = undefined;
        if (req.body.password !== undefined) {
          if (req.body.password === null || req.body.password === '') {
            password = null;
          } else if (typeof req.body.password === 'string') {
            password = await hashPassword(req.body.password);
          } else {
            return res.badRequest('password must be a string');
          }
        }

        if (req.body.vanity) {
          const existingUrl = await prisma.url.findFirst({
            where: {
              vanity: req.body.vanity,
            },
          });

          if (existingUrl) return res.badRequest('vanity already exists');
        }

        const updatedUrl = await prisma.url.update({
          where: {
            id: id,
          },
          data: {
            ...(req.body.vanity !== undefined && { vanity: req.body.vanity }),
            ...(req.body.password !== undefined && { password }),
            ...(req.body.maxViews !== undefined && { maxViews: req.body.maxViews }),
            ...(req.body.destination !== undefined && { destination: req.body.destination }),
            ...(req.body.enabled !== undefined && { enabled: req.body.enabled }),
          },
          omit: {
            password: true,
          },
        });

        logger.info(`${req.user.username} updated URL ${updatedUrl.id}`, {
          updated: Object.keys(req.body),
        });

        return res.send(updatedUrl);
      },
    );

    server.delete(
      PATH,
      {
        schema: {
          params: paramsSchema,
          response: {
            200: urlSchema.omit({ password: true }),
          },
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        const { id } = req.params;

        const url = await prisma.url.findFirst({
          where: {
            id: id,
            userId: req.user.id,
          },
        });

        if (!url) return res.notFound();

        const deletedUrl = await prisma.url.delete({
          where: {
            id: id,
          },
          omit: {
            password: true,
          },
        });

        logger.info(`${req.user.username} deleted URL ${deletedUrl.id}`, {
          dest: deletedUrl.destination,
        });

        return res.send(deletedUrl);
      },
    );
  },
  { name: PATH },
);
