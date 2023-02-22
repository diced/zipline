import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function uploadsRoute(this: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  if (id === '') return reply.notFound();
  else if (id === 'dashboard' && !this.config.features.headless)
    return this.nextServer.render(req.raw, reply.raw, '/dashboard');

  const image = await this.prisma.file.findFirst({
    where: {
      OR: [{ name: id }, { invisible: { invis: decodeURI(encodeURI(id)) } }],
    },
  });
  if (!image) return reply.rawFile(id);

  const failed = await reply.preFile(image);
  if (failed) return reply.notFound();

  if (image.password || image.embed || image.mimetype.startsWith('text/'))
    return reply.redirect(`/view/${image.name}`);
  else return reply.dbFile(image);
}

export async function uploadsRouteOnResponse(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
  done: () => void
) {
  if (reply.statusCode === 200) {
    const { id } = req.params as { id: string };

    const file = await this.prisma.file.findFirst({
      where: {
        OR: [{ name: id }, { invisible: { invis: decodeURI(encodeURI(id)) } }],
      },
    });

    reply.postFile(file);
  }

  done();
}
