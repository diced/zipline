import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import exts from 'lib/exts';

export default async function uploadsRoute(this: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  if (id === '') return reply.notFound();
  else if (id === 'dashboard' && !this.config.features.headless)
    return this.nextServer.render(req.raw, reply.raw, '/dashboard');

  const file = await this.prisma.file.findFirst({
    where: {
      OR: [{ name: id }, { name: decodeURI(id) }, { invisible: { invis: decodeURI(encodeURI(id)) } }],
    },
  });
  if (!file) return reply.rawFile(id);

  const failed = await reply.preFile(file);
  if (failed) return reply.notFound();

  const ext = file.name.split('.').pop();

  if (file.password || file.embed || file.mimetype.startsWith('text/') || Object.keys(exts).includes(ext))
    return reply.redirect(`/view/${file.name}`);
  else return reply.dbFile(file);
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
