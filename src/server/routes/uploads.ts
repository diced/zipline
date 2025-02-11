import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function uploadsRoute(this: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  if (id === '') return reply.notFound();
  else if (id === 'dashboard' && !this.config.features.headless && this.config.uploader.route === '/')
    return this.nextServer.render(req.raw, reply.raw, '/dashboard');

  const file = await this.prisma.file.findFirst({
    where: {
      OR: [{ name: id }, { name: decodeURI(id) }, { invisible: { invis: decodeURI(encodeURI(id)) } }],
    },
  });

  if (!file) return reply.notFound();

  const failed = await reply.preFile(file);
  if (failed) return reply.notFound();

  // @ts-ignore
  return this.nextServer.render(req.raw, reply.raw, `/view/${file.name}`, req.query);
}

export async function uploadsRouteOnResponse(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
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
