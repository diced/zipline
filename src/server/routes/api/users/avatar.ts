import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export const PATH = '/api/users/:username/avatar';

export default typedPlugin(
  async (server) => {
    server.get<{ Params: { username: string } }>(
      PATH,
      {
        schema: {
          description: "Return a user's public avatar as a binary image response.",
          params: z.object({ username: z.string() }),
          tags: ['users'],
        },
      },
      async (req, res) => {
        const { username } = req.params;

        const user = await prisma.user.findFirst({
          where: { username: { equals: username, mode: 'insensitive' } },
          select: { avatar: true },
        });

        if (!user || !user.avatar) throw new ApiError(4000);

        // Plain URL — redirect to the remote image
        if (!user.avatar.startsWith('data:')) {
          return res
            .header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
            .redirect(user.avatar);
        }

        // Parse the data URL: "data:<mime>;base64,<data>"
        const match = user.avatar.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new ApiError(4000);

        const [, mime, b64] = match;
        const buf = Buffer.from(b64, 'base64');

        return res
          .header('Content-Type', mime)
          .header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
          .header('Content-Length', buf.length)
          .send(buf);
      },
    );
  },
  { name: PATH },
);
