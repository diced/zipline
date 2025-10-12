import { prisma } from '@/lib/db';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';
import { z } from 'zod';

const _schema = z.object({
  name: z.string().min(1).max(255),
  public: z.boolean().optional().default(false),
  allowUploads: z.boolean().optional().default(false),
});

type Body = z.infer<typeof _schema>;

export const PATH = '/api/folders/create';
export default fastifyPlugin((server, _, done) => {
  server.post<{ Body: Body }>(PATH, { preHandler: [userMiddleware] }, async (req, res) => {
    const { name, public: isPublic, allowUploads } = req.body;

    const existingFolder = await prisma.folder.findFirst({
      where: {
        userId: req.user.id,
        name: name.trim(),
      },
    });

    if (existingFolder) {
      return res.status(409).send({ error: 'A folder with this name already exists' });
    }

    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        public: isPublic,
        allowUploads,
        userId: req.user.id,
      },
      include: {
        _count: {
          select: {
            files: true,
          },
        },
      },
    });

    return folder;
  });

  done();
});
