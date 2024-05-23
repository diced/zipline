import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { OAuthProvider, OAuthProviderType } from '@prisma/client';

export type ApiAuthOauthResponse = OAuthProvider[];

type Body = {
  provider?: OAuthProviderType;
};

const logger = log('api').c('auth').c('oauth');

async function handler(req: NextApiReq<Body>, res: NextApiRes<ApiAuthOauthResponse>) {
  if (req.method === 'DELETE') {
    const { password } = (await prisma.user.findFirst({
      where: {
        id: req.user.id,
      },
      select: {
        password: true,
      },
    }))!;

    if (!req.user.oauthProviders.length) return res.badRequest('No providers to delete');
    if (req.user.oauthProviders.length === 1 && !password)
      return res.badRequest("You can't your last oauth provider without a password");

    const { provider } = req.body;
    if (!provider) return res.badRequest('Provider is required');

    const providers = await prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        oauthProviders: {
          deleteMany: [{ provider }],
        },
      },
      include: {
        oauthProviders: true,
      },
    });

    logger.info(`${req.user.username} unlinked an oauth provider`, {
      provider,
    });

    return res.ok(providers.oauthProviders);
  } else {
    return res.ok(req.user.oauthProviders);
  }
}

export default combine([method(['GET', 'DELETE']), ziplineAuth()], handler);
