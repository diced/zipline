import { parseRange } from '@/lib/api/range';
import { config } from '@/lib/config';
import { verifyPassword, decryptBuffer } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import fastifyPlugin from 'fastify-plugin';
import { parse } from 'url';
import { Readable } from 'stream';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

type Params = {
  id: string;
};

type Querystring = {
  pw?: string;
  download?: string;
};

const logger = log('routes').c('raw');

export const PATH = '/raw/:id';
export default fastifyPlugin(
  (server, _, done) => {
    server.get<{
      Querystring: Querystring;
      Params: Params;
    }>(PATH, async (req, res) => {
      const { id } = req.params;
      const { pw, download } = req.query;

      const parsedUrl = parse(req.url!, true);

      const file = await prisma.file.findFirst({
        where: {
          name: decodeURIComponent(id),
        },
      });

      if (file?.deletesAt && file.deletesAt <= new Date()) {
        try {
          await datasource.delete(file.name);
          await prisma.file.delete({
            where: {
              id: file.id,
            },
          });
        } catch (e) {
          logger
            .error('failed to delete file on expiration', {
              id: file.id,
            })
            .error(e as Error);
        }

        return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);
      }

      if (file?.maxViews && file.views >= file.maxViews) {
        if (!config.features.deleteOnMaxViews)
          return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

        try {
          await datasource.delete(file.name);
          await prisma.file.delete({
            where: {
              id: file.id,
            },
          });
        } catch (e) {
          logger
            .error('failed to delete file on max views', {
              id: file.id,
            })
            .error(e as Error);
        }

        return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);
      }

      if (file?.password) {
        if (!pw) return res.forbidden('Password protected.');
        const verified = await verifyPassword(pw, file.password!);

        if (!verified) return res.forbidden('Incorrect password.');
      }

      // determine size for Content-Length & range
      const effectiveSize = file?.isEncrypted ? file.originalSize : file?.size;
      if (effectiveSize === null || effectiveSize === undefined) {
        logger.error('file size information missing for file', { name: file?.name ?? id });
        return res.internalServerError('File size information missing');
      }
      const sizeBigInt = BigInt(effectiveSize);

      const needsDecryption = !!(file?.isEncrypted && config.encryption.enabled && config.encryption.key);
      let decryptedBuffer: Buffer | null = null;

      if (req.headers.range) {
        const sizeNumber = Number(sizeBigInt);
        const [start, end] = parseRange(req.headers.range, sizeNumber);

        if (start >= sizeNumber || end >= sizeNumber) {
          // range is invalid
          const responseStream = await datasource.get(file?.name ?? id);
          if (!responseStream) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

          let responseBuffer = await streamToBuffer(responseStream);

          if (needsDecryption) {
            const decrypted = await decryptBuffer(
              responseBuffer,
              config.encryption.key!,
              config.encryption.algorithm,
            );
            if (!decrypted) {
              logger.error('decryption failed for 416 response', { name: file?.name ?? id });
              return res.internalServerError('Failed to decrypt file data');
            }
            responseBuffer = decrypted;
          }

          return res
            .type(file?.type || 'application/octet-stream')
            .headers({
              'Content-Length': sizeBigInt.toString(),
              ...(file?.originalName
                ? {
                    'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(file.originalName)}"`,
                  }
                : download && {
                    'Content-Disposition': 'attachment;',
                  }),
            })
            .status(416)
            .send(responseBuffer);
        }

        let rangeBuffer: Buffer;

        if (needsDecryption) {
          // encrypted file, fetch the whole file stream, convert to buffer, decrypt, then slice
          const fullEncryptedStream = await datasource.get(file?.name ?? id);
          if (!fullEncryptedStream) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

          const fullEncryptedBuffer = await streamToBuffer(fullEncryptedStream);

          decryptedBuffer = await decryptBuffer(
            fullEncryptedBuffer,
            config.encryption.key!,
            config.encryption.algorithm,
          );
          if (!decryptedBuffer) {
            logger.error('decryption failed for range request', { name: file?.name ?? id });
            return res.internalServerError('Failed to decrypt file data');
          }
          rangeBuffer = decryptedBuffer.subarray(start, end + 1);
        } else {
          // non-encrypted file
          const rangeStream = await datasource.range(file?.name ?? id, start, end);
          if (!rangeStream) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);
          rangeBuffer = await streamToBuffer(rangeStream);
        }

        return res
          .type(file?.type || 'application/octet-stream')
          .headers({
            'Content-Range': `bytes ${start.toString()}-${end.toString()}/${sizeBigInt.toString()}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': rangeBuffer.length,
            ...(file?.originalName
              ? {
                  'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(file.originalName)}"`,
                }
              : download && {
                  'Content-Disposition': 'attachment;',
                }),
          })
          .status(206)
          .send(rangeBuffer);
      }

      const responseStream = await datasource.get(file?.name ?? id);
      if (!responseStream) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

      // convert the stream to a buffer
      let responseBuffer = await streamToBuffer(responseStream);

      if (needsDecryption) {
        decryptedBuffer = await decryptBuffer(
          responseBuffer,
          config.encryption.key!,
          config.encryption.algorithm,
        );
        if (!decryptedBuffer) {
          logger.error('decryption failed for full file request', { name: file?.name ?? id });
          return res.internalServerError('Failed to decrypt file data');
        }
        responseBuffer = decryptedBuffer;
      }

      return res
        .type(file?.type || 'application/octet-stream')
        .headers({
          'Content-Length': sizeBigInt.toString(),
          'Accept-Ranges': 'bytes',
          ...(file?.originalName
            ? {
                'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(file.originalName)}"`,
              }
            : download && {
                'Content-Disposition': 'attachment;',
              }),
        })
        .status(200)
        .send(responseBuffer);
    });

    done();
  },
  { name: PATH },
);
