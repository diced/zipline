import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function rawRoute(this: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  if (id === '') return reply.notFound();

  const image = await this.prisma.image.findFirst({
    where: {
      OR: [{ file: id }, { invisible: { invis: decodeURI(id) } }],
    },
  });

  if (!image) return reply.rawFile(id);
  else {
    const failed = await reply.preFile(image);
    if (failed) return reply.notFound();

    if (image.password) {
      return reply
        .type('application/json')
        .code(403)
        .send({
          error: "can't view a raw file that has a password",
          url: `/view/${image.file}`,
          code: 403,
        });
    } else return reply.rawFile(image.file);
  }
}
