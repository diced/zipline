import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function rawRoute(this: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  if (id === '') return reply.notFound();

  const file = await this.prisma.file.findFirst({
    where: {
      OR: [{ name: decodeURIComponent(id) }, { invisible: { invis: decodeURI(id) } }],
    },
  });

  if (!file) return reply.rawFile(id);
  else {
    const failed = await reply.preFile(file);
    if (failed) return reply.notFound();

    if (file.password) {
      return reply
        .type('application/json')
        .code(403)
        .send({
          error: "can't view a raw file that has a password",
          url: `/view/${file.name}`,
          code: 403,
        });
    } else return reply.rawFile(file.name);
  }
}
