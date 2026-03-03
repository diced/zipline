import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { Invite } from '@/lib/db/models/invite';
import { secondlyRatelimit } from '@/lib/ratelimits';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiAuthInvitesWebResponse = Invite & {
  inviter: {
    username: string;
  };
};

export const PATH = '/api/auth/invites/web';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Look up a public invite by code for the web UI, returning basic information about the inviter and usage limits.',
          querystring: z.object({ code: z.string().optional() }),
          response: {
            200: z.object({
              invite: z
                .object({
                  code: z.string(),
                  maxUses: z.number().nullable(),
                  uses: z.number(),
                  inviter: z.object({ username: z.string() }),
                })
                .nullable(),
            }),
          },
        },
        ...secondlyRatelimit(10),
      },
      async (req, res) => {
        const { code } = req.query;

        if (!code) return res.send({ invite: null });
        if (!config.invites.enabled) throw new ApiError(9002);

        const invite = await prisma.invite.findFirst({
          where: {
            OR: [{ id: code }, { code }],
          },
          select: {
            code: true,
            maxUses: true,
            uses: true,
            expiresAt: true,
            inviter: {
              select: { username: true },
            },
          },
        });

        if (
          !invite ||
          (invite.expiresAt && new Date(invite.expiresAt) < new Date()) ||
          (invite.maxUses && invite.uses >= invite.maxUses)
        ) {
          throw new ApiError(9002);
        }

        delete (invite as any).expiresAt;

        return res.send({ invite });
      },
    );
  },
  { name: PATH },
);
