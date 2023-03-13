import { FastifyInstance, FastifyReply } from 'fastify';
import { guess } from 'lib/mimes';
import { extname } from 'path';
import fastifyPlugin from 'fastify-plugin';
import { createBrotliCompress, createDeflate, createGzip } from 'zlib';
import pump from 'pump';
import { Transform } from 'stream';

function rawFileDecorator(fastify: FastifyInstance, _, done) {
  fastify.decorateReply('rawFile', rawFile);
  done();

  async function rawFile(this: FastifyReply, id: string) {
    const { download, nocompress } = this.request.query as { download?: string; nocompress?: boolean };

    const data = await this.server.datasource.get(id);
    if (!data) return this.notFound();

    const mimetype = await guess(extname(id).slice(1));
    const size = await this.server.datasource.size(id);
    this.header('Content-Type', download ? 'application/octt-stream' : mimetype);

    if (
      this.server.config.core.compression.enabled &&
      size > this.server.config.core.compression.threshold &&
      !nocompress &&
      !this.request.headers['X-Zipline-NoCompress'] &&
      !!this.request.headers['accept-encoding']
    )
      return this.send(useCompress.call(this, data));
    this.header('Content-Length', size);
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
  setTimeout(() => compress.destroy(), 1000);
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
