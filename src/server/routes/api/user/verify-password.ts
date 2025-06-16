import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';

type Body = {
  password: string;
};

export const PATH = '/api/user/verify-password';
export default fastifyPlugin(
  (server, _, done) => {
    server.route<{
      Body: Body;
    }>({
      url: PATH,
      method: 'POST',
      preHandler: [userMiddleware],
      handler: async (req, res) => {
        const { password } = req.body;

        if (!password) {
          return res.badRequest('Password is required');
        }

        const user = await prisma.user.findFirst({
          where: {
            id: req.user.id,
          },
        });        if (!user) {
          return res.notFound('User not found');
        }

        if (!user.password) {
          return res.badRequest('User does not have a password');
        }

        const valid = await verifyPassword(password, user.password);

        if (!valid) {
          return res.send({ valid: false });
        }

        // If verification is for token access, include the token
        let tokenResponse = { valid: true };
        
        // Always include token when password is verified for this endpoint
        const tokenResponse2 = {
          valid: true,
          token: user.token,
        };

        return res.send(tokenResponse2);
      },
    });

    done();
  },
  { name: PATH },
);
