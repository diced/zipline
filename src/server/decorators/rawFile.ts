import { FastifyInstance, FastifyReply } from 'fastify';
import { guess } from 'lib/mimes';
import { extname } from 'path';
import fastifyPlugin from 'fastify-plugin';
import { createBrotliCompress, createDeflate, createGzip } from 'zlib';
import pump from 'pump';
import { Transform } from 'stream';
import { parseRangeHeader } from 'lib/utils/range';

function rawFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('rawFile', rawFile);
  done();

  async function rawFile(this: FastifyReply, id: string) {
    const { download, compress = 'false' } = this.request.query as { download?: string; compress?: string };
    const size = await this.server.datasource.size(id);
    if (size === null) return this.notFound();

    const mimetype = await guess(extname(id).slice(1));

    // eslint-disable-next-line prefer-const
    let [rangeStart, rangeEnd] = parseRangeHeader(this.request.headers.range);
    if (rangeStart >= rangeEnd)
      return this.code(416)
        .header('Content-Range', `bytes 0/${size - 1}`)
        .send();
    if (rangeEnd === Infinity) rangeEnd = size - 1;

    const data = await this.server.datasource.get(id);

    // only send content-range if the client asked for it
    if (this.request.headers.range) {
      this.code(206);
      this.header('Content-Range', `bytes ${rangeStart}-${rangeEnd}/${size}`);
    }

    this.header('Content-Length', rangeEnd - rangeStart + 1);
    this.header('Content-Type', download ? 'application/octet-stream' : mimetype);
    this.header('Accept-Ranges', 'bytes');

    if (
      this.server.config.core.compression.enabled &&
      (compress?.match(/^true$/i) || !this.request.headers['X-Zipline-NoCompress']) &&
      !!this.request.headers['accept-encoding']
    )
      if (
        size > this.server.config.core.compression.threshold &&
        mimetype.match(/^(image(?!\/(webp))|video(?!\/(webm))|text)/)
      )
        return this.send(useCompress.call(this, data));

    return this.send(data);
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
    rawFile: (id: string) => Promise<void>;
  }
}
