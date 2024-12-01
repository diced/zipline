import { File } from '@prisma/client';
import { FastifyInstance, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import exts from 'lib/exts';
import { parseRangeHeader } from 'lib/utils/range';

function dbFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('dbFile', dbFile);
  done();

  async function dbFile(this: FastifyReply, file: File) {
    const { download } = this.request.query as { download?: string };

    const ext = file.name.split('.').pop();
    if (Object.keys(exts).includes(ext)) return this.server.nextHandle(this.request.raw, this.raw);

    const size = await this.server.datasource.size(file.name);
    if (size === null) return this.notFound();

    // eslint-disable-next-line prefer-const
    let [rangeStart, rangeEnd] = parseRangeHeader(this.request.headers.range);
    if (rangeStart >= rangeEnd)
      return this.code(416)
        .header('Content-Range', `bytes */${size - 1}`)
        .send();
    if (rangeEnd === Infinity) rangeEnd = size - 1;

    const data = await this.server.datasource.get(file.name, rangeStart, rangeEnd);

    // only send content-range if the client asked for it
    if (this.request.headers.range) {
      this.code(206);
      this.header('Content-Range', `bytes ${rangeStart}-${rangeEnd}/${size}`);
    }

    this.header('Content-Length', rangeEnd - rangeStart + 1);
    this.header('Content-Type', download ? 'application/octet-stream' : file.mimetype);
    this.header('Content-Disposition', `inline; filename="${encodeURI(file.originalName || file.name)}"`);
    this.header('Accept-Ranges', 'bytes');

    return this.send(data);
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
