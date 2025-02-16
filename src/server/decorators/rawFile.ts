import { FastifyInstance, FastifyReply } from 'fastify';
import { guess } from 'lib/mimes';
import { extname } from 'path';
import fastifyPlugin from 'fastify-plugin';
import { createBrotliCompress, createDeflate, createGzip } from 'zlib';
import { Transform } from 'stream';
import { parseRange } from 'lib/utils/range';
import type { File, Thumbnail } from '@prisma/client';
import { pipeline } from 'stream/promises';

function rawFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('rawFile', rawFile);
  done();

  async function rawFile(this: FastifyReply, file: Partial<File> & { thumbnail?: Partial<Thumbnail> }) {
    const { download, compress = 'false' } = this.request.query as { download?: string; compress?: string };
    const isThumb = (this.request.params['id'] as string) === file.thumbnail?.name,
      filename = isThumb ? file.thumbnail?.name : file.name,
      fileMime = isThumb ? null : file.mimetype;

    const logger = this.server.logger.child('rawRoute');

    const size = await this.server.datasource.size(filename);
    if (size === null) return this.notFound();

    const mimetype = await guess(extname(filename).slice(1));

    if (this.request.headers.range && !compress?.match(/^true$/i)) {
      logger.debug('responding raw file with ranged');
      const [start, end] = parseRange(this.request.headers.range, size);
      if (start >= size || end >= size) {
        const buf = await datasource.get(filename);
        if (!buf) return this.server.nextServer.render404(this.request.raw, this.raw);

        return this.type(fileMime || mimetype || 'application/octet-stream')
          .headers({
            'Content-Length': size,
            'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(
              isThumb ? filename : file.originalName ?? filename,
            )}`,
          })
          .status(416)
          .send(buf);
      }

      const buf = await datasource.range(filename, start || 0, end);
      if (!buf) return this.server.nextServer.render404(this.request.raw, this.raw);

      return this.type(fileMime || mimetype || 'application/octet-stream')
        .headers({
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(
            isThumb ? filename : file.originalName ?? filename,
          )}`,
        })
        .status(206)
        .send(buf);
    }

    const data = await datasource.get(filename);
    if (!data) return this.server.nextServer.render404(this.request.raw, this.raw);

    if (
      this.server.config.core.compression.enabled &&
      compress?.match(/^true$/i) &&
      !this.request.headers['X-Zipline-NoCompress'] &&
      !!this.request.headers['accept-encoding'] &&
      size > this.server.config.core.compression.threshold &&
      (fileMime || mimetype).match(/^(image(?!\/(webp))|video|text)/)
    ) {
      logger.debug('responding raw file with compressed');
      this.hijack();
      return await useCompress.call(this, data);
    }

    logger.debug('responding raw file with full size');

    return this.type(mimetype || 'application/octet-stream')
      .headers({
        'Content-Length': size,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(
          isThumb ? filename : file.originalName ?? filename,
        )}`,
      })
      .status(200)
      .send(data);
  }
}

async function useCompress(this: FastifyReply, data: NodeJS.ReadableStream) {
  let compress: Transform;

  switch ((this.request.headers['accept-encoding'] as string).split(', ')[0]) {
    case 'gzip':
    case 'x-gzip':
      compress = createGzip();
      this.raw.writeHead(200, { 'Content-Encoding': 'gzip' });
      break;
    case 'deflate':
      compress = createDeflate();
      this.raw.writeHead(200, { 'Content-Encoding': 'deflate' });
      break;
    case 'br':
      compress = createBrotliCompress();
      this.raw.writeHead(200, { 'Content-Encoding': 'br' });
      break;
    default:
      this.server.logger
        .child('response')
        .debug(`Unsupported supplied encoding: ${this.request.headers['accept-encoding']}`);
      this.raw.writeHead(200, {});
      break;
  }
  if (!compress) return await pipeline(data, this.raw);

  return await pipeline(data, compress, this.raw);
}

export default fastifyPlugin(rawFileDecorator, {
  name: 'rawFile',
  decorators: {
    fastify: ['datasource', 'logger'],
  },
});

declare module 'fastify' {
  interface FastifyReply {
    rawFile: (file: Partial<File> & { thumbnail?: Partial<Thumbnail> }) => Promise<void>;
  }
}
