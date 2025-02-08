import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { checkPassword } from 'lib/util';

export default async function rawRoute(this: FastifyInstance, req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const { password } = req.query as { password: string };
  if (id === '') return reply.notFound();

  const file = await this.prisma.file.findFirst({
    where: {
      OR: [{ name: id }, { invisible: { invis: decodeURI(encodeURI(id)) } }, { thumbnail: { name: id } }],
    },
    include: {
      thumbnail: true,
    },
  });

  if (!file) return reply.notFound();

  if (file.password) {
    if (!password)
      return reply
        .type('application/json')
        .code(403)
        .send({ error: 'incorrect password', url: `/view/${file.name}`, code: 403 });
    const success = await checkPassword(password, file.password);

    if (!success)
      return reply
        .type('application/json')
        .code(403)
        .send({ error: 'incorrect password', url: `/view/${file.name}`, code: 403 });
  }

  return (await reply.preFile(file)) ? reply.notFound() : reply.rawFile(file);
}
