import { FastifyInstance, FastifyReply } from 'fastify';
import { guess } from 'lib/mimes';
import { extname } from 'path';
import fastifyPlugin from 'fastify-plugin';
import { createBrotliCompress, createDeflate, createGzip } from 'zlib';
import pump from 'pump';
import { Transform } from 'stream';
import { parseRange } from 'lib/utils/range';
import { File } from '@prisma/client';

function rawFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('rawFile', rawFile);
  done();

  async function rawFile(this: FastifyReply, file: Partial<File>) {
    const { download, compress = 'false' } = this.request.query as { download?: string; compress?: string };
    const size = await this.server.datasource.size(file.name);
    if (size === null) return this.notFound();

    const mimetype = await guess(extname(file.name).slice(1));

    if (this.request.headers.range) {
      const [start, end] = parseRange(this.request.headers.range, size);
      if (start >= size || end >= size) {
        const buf = await datasource.get(file.name);
        if (!buf) return this.server.nextServer.render404(this.request.raw, this.raw);

        return this.type(file.mimetype || mimetype || 'application/octet-stream')
          .headers({
            'Content-Length': size,
            'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(
              file.originalName ?? file.name,
            )}`,
          })
          .status(416)
          .send(buf);
      }

      const buf = await datasource.range(file.name, start || 0, end);
      if (!buf) return this.server.nextServer.render404(this.request.raw, this.raw);

      return this.type(file.mimetype || mimetype || 'application/octet-stream')
        .headers({
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(
            file.originalName ?? file.name,
          )}`,
        })
        .status(206)
        .send(buf);
    }

    const data = await datasource.get(file.name);
    if (!data) return this.server.nextServer.render404(this.request.raw, this.raw);

    if (
      this.server.config.core.compression.enabled &&
      (compress?.match(/^true$/i) || !this.request.headers['X-Zipline-NoCompress']) &&
      !!this.request.headers['accept-encoding']
    )
      if (
        size > this.server.config.core.compression.threshold &&
        (file.mimetype || mimetype).match(/^(image(?!\/(webp))|vfileeo(?!\/(webm))|text)/)
      )
        return this.send(useCompress.call(this, data));

    return this.type(mimetype || 'application/octet-stream')
      .headers({
        'Content-Length': size,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(
          file.originalName ?? file.name,
        )}`,
      })
      .status(200)
      .send(data);
  }
}

function useCompress(this: FastifyReply, data: NodeJS.ReadableStream) {
  let compress: Transform;

  switch ((this.request.headers['accept-encoding'] as string).split(', ')[0]) {
    case 'gzip':
    case 'x-gzip':
      compress = createGzip();
      this.header('Content-Encoding', 'gzip');
      break;
    case 'deflate':
      compress = createDeflate();
      this.header('Content-Encoding', 'deflate');
      break;
    case 'br':
      compress = createBrotliCompress();
      this.header('Content-Encoding', 'br');
      break;
    default:
      this.server.logger
        .child('response')
        .error(`Unsupported encoding: ${this.request.headers['accept-encoding']}}`);
      break;
  }
  if (!compress) return data;
  setTimeout(() => compress.destroy(), 2000);
  return pump(data, compress, (err) => (err ? this.server.logger.error(err) : null));
}

export default fastifyPlugin(rawFileDecorator, {
  name: 'rawFile',
  decorators: {
    fastify: ['datasource', 'logger'],
  },
});

declare module 'fastify' {
  interface FastifyReply {
    rawFile: (file: Partial<File>) => Promise<void>;
  }
}
