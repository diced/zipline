import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import config from 'lib/config';
import Logger from 'lib/logger';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'lib/middleware/withZipline';
import prisma from 'lib/prisma';
import { randomChars } from 'lib/util';
import { parseExpiry } from 'lib/utils/client';

const logger = Logger.get('invite');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (!config.features.invites) return res.badRequest('invites are disabled');

  if (req.method === 'POST') {
    const { expiresAt, count } = req.body as {
      expiresAt: string;
      count: number;
    };

    let expiry: Date;
    try {
      expiry = parseExpiry(expiresAt);
    } catch (error) {
      return res.badRequest(error.message);
    }
    const counts = count ? count : 1;

    if (counts > 1) {
      const data = [];
      for (let i = 0; i !== counts; ++i) {
        data.push({
          code: randomChars(config.features.invites_length),
          createdById: user.id,
          expiresAt: expiry,
        });
      }

      await prisma.invite.createMany({ data });

      logger.debug(`created invites ${JSON.stringify(data)}`);

      logger.info(
        `${user.username} (${user.id}) created ${data.length} invites with codes ${data
          .map((invite) => invite.code)
          .join(', ')}`,
      );

      return res.json(data);
    } else {
      const invite = await prisma.invite.create({
        data: {
          code: randomChars(config.features.invites_length),
          createdById: user.id,
          expiresAt: expiry,
        },
      });

      logger.debug(`created invite ${JSON.stringify(invite)}`);

      logger.info(`${user.username} (${user.id}) created invite ${invite.code}`);

      return res.json(invite);
    }
  } else if (req.method === 'DELETE') {
    const { code } = req.query as { code: string };
    if (!code) return res.badRequest('no code');

    try {
      const invite = await prisma.invite.delete({
        where: {
          code,
        },
      });

      logger.debug(`deleted invite ${JSON.stringify(invite)}`);

      logger.info(`${user.username} (${user.id}) deleted invite ${invite.code}`);

      return res.json(invite);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) return res.notFound('invite not found');
      else throw error;
    }
  } else {
    const invites = await prisma.invite.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(invites);
  }
}

export default withZipline(handler, {
  methods: ['GET', 'POST', 'DELETE'],
  user: true,
  administrator: true,
});
