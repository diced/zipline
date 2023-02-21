import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function urlsRoute(this: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  if (id === '') return reply.notFound();
  else if (id === 'dashboard' && !this.config.features.headless)
    return this.nextServer.render(req.raw, reply.raw, '/dashboard');

  const url = await this.prisma.url.findFirst({
    where: {
      OR: [{ id }, { vanity: decodeURIComponent(id) }, { invisible: { invis: decodeURI(id) } }],
    },
  });
  if (!url) return reply.notFound();

  reply.redirect(url.destination);

  reply.postUrl(url);
}

export async function urlsRouteOnResponse(
  this: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
  done: () => void
) {
  if (reply.statusCode === 200) {
    const { id } = req.params as { id: string };

    const url = await this.prisma.url.findFirst({
      where: {
        OR: [{ id }, { vanity: id }, { invisible: { invis: decodeURI(id) } }],
      },
    });

    reply.postUrl(url);
  }

  done();
}
