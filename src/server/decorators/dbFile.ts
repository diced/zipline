import { File } from '@prisma/client';
import { FastifyInstance, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import exts from 'lib/exts';
import { parseRange } from 'lib/utils/range';

function dbFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('dbFile', dbFile);
  done();

  async function dbFile(this: FastifyReply, file: File) {
    const { download } = this.request.query as { download?: string };

    const ext = file.name.split('.').pop();
    if (Object.keys(exts).includes(ext)) return this.server.nextHandle(this.request.raw, this.raw);

    const size = await this.server.datasource.size(file.name);
    if (size === null) return this.notFound();

    if (this.request.headers.range) {
      const [start, end] = parseRange(this.request.headers.range, size);
      if (start >= size || end >= size) {
        const buf = await datasource.get(file.name);
        if (!buf) return this.server.nextServer.render404(this.request.raw, this.raw);

        return this.type(file.mimetype || 'application/octet-stream')
          .headers({
            'Content-Length': size,
            ...(file.originalName
              ? {
                  'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(
                    file.originalName,
                  )}"`,
                }
              : download && {
                  'Content-Disposition': 'attachment;',
                }),
          })
          .status(416)
          .send(buf);
      }

      const buf = await datasource.range(file.name, start || 0, end);
      if (!buf) return this.server.nextServer.render404(this.request.raw, this.raw);

      return this.type(file.mimetype || 'application/octet-stream')
        .headers({
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          ...(file.originalName
            ? {
                'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(
                  file.originalName,
                )}"`,
              }
            : download && {
                'Content-Disposition': 'attachment;',
              }),
        })
        .status(206)
        .send(buf);
    }

    const data = await datasource.get(file.name);
    if (!data) return this.server.nextServer.render404(this.request.raw, this.raw);

    return this.type(file.mimetype || 'application/octet-stream')
      .headers({
        'Content-Length': size,
        'Accept-Ranges': 'bytes',
        ...(file.originalName
          ? {
              'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(
                file.originalName,
              )}"`,
            }
          : download && {
              'Content-Disposition': 'attachment;',
            }),
      })
      .status(200)
      .send(data);
  }
}

export default fastifyPlugin(dbFileDecorator, {
  name: 'dbFile',
  decorators: {
    fastify: ['prisma', 'datasource', 'nextHandle', 'logger'],
  },
});

declare module 'fastify' {
  interface FastifyReply {
    dbFile: (file: File) => Promise<void>;
  }
}
