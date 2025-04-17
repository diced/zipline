import { parseRange } from '@/lib/api/range';
import { config } from '@/lib/config';
import { verifyPassword, decryptBuffer } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { parse } from 'url';
import { Readable } from 'stream';

// TODO: move to shared
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

type Query = {
  pw?: string;
  download?: string;
};

const logger = log('routes').c('files');

export async function filesRoute(
  req: FastifyRequest<{ Params: Params; Querystring: Query }>,
  res: FastifyReply,
) {
  const { id } = req.params;
  const { pw, download } = req.query;

  const parsedUrl = parse(req.url!, true);

  const file = await prisma.file.findFirst({
    where: {
      name: decodeURIComponent(id),
    },
    include: {
      User: true,
    },
  });

  if (!file) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

  if (file.deletesAt && file.deletesAt <= new Date()) {
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

  if (file.maxViews && file.views >= file.maxViews) {
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

  if (file.User?.view.enabled) return res.redirect(`/view/${encodeURIComponent(file.name)}`);

  if (file.type.startsWith('text/')) return res.redirect(`/view/${encodeURIComponent(file.name)}`);

  const needsDecryption = !!(file.isEncrypted && config.encryption.enabled && config.encryption.key);

  if (file.password) {
    if (!pw) return res.redirect(`/view/${encodeURIComponent(file.name)}`);

    const verified = await verifyPassword(pw as string, file.password!);

    if (!verified) {
      logger.warn('password protected file accessed with an incorrect password', { id: file.id, ip: req.ip });

      return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);
    }
  }

  if (!req.headers.range) {
    await prisma.file.update({
      where: {
        id: file.id,
      },
      data: {
        views: {
          increment: 1,
        },
      },
    });
  }

  // determine size after pwd check
  const effectiveSize = file.isEncrypted ? file.originalSize : file.size;
  if (effectiveSize === null || effectiveSize === undefined) {
    logger.error('file size information missing for file', { name: file.name });
    return res.internalServerError('File size information missing');
  }
  const sizeBigInt = BigInt(effectiveSize);

  if (req.headers.range) {
    const sizeNumber = Number(sizeBigInt);
    const [start, end] = parseRange(req.headers.range, sizeNumber);

    if (start >= sizeNumber || end >= sizeNumber) {
      // requested range is invalid
      const responseStream416 = await datasource.get(file.name);
      if (!responseStream416) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

      let responseBuffer416 = await streamToBuffer(responseStream416);

      if (needsDecryption) {
        logger.info(`attempting decryption for 416 response. buffer size: ${responseBuffer416.length}`);
        const decrypted416 = await decryptBuffer(
          responseBuffer416,
          config.encryption.key!,
          config.encryption.algorithm,
        );
        if (!decrypted416) {
          logger.error('decryption failed for 416 response', { name: file.name });
          return res.internalServerError('Failed to decrypt file data');
        }
        responseBuffer416 = decrypted416;
        logger.info(`decryption successful for 416. Decrypted size: ${responseBuffer416.length}`);
      }

      return res
        .type(file.type || 'application/octet-stream')
        .headers({
          'Content-Length': sizeBigInt.toString(),
          ...(file.originalName
            ? {
                'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(file.originalName)}"`,
              }
            : download && {
                'Content-Disposition': 'attachment;',
              }),
        })
        .status(416)
        .send(responseBuffer416);
    }

    let rangeBuffer: Buffer;

    if (needsDecryption) {
      const fullEncryptedStream = await datasource.get(file.name);
      if (!fullEncryptedStream) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);
      const fullEncryptedBuffer = await streamToBuffer(fullEncryptedStream);

      logger.info(`attempting decryption for range request. full buffer size: ${fullEncryptedBuffer.length}`);
      const decryptedRange = await decryptBuffer(
        fullEncryptedBuffer,
        config.encryption.key!,
        config.encryption.algorithm,
      );
      if (!decryptedRange) {
        logger.error('decryption failed for range request', { name: file.name });
        return res.internalServerError('Failed to decrypt file data');
      }
      logger.info(`decryption successful for range request. decrypted size: ${decryptedRange.length}`);
      rangeBuffer = decryptedRange.subarray(start, end + 1);
    } else {
      // non-encrypted
      const rangeStream = await datasource.range(file.name, start, end);
      if (!rangeStream) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);
      rangeBuffer = await streamToBuffer(rangeStream);
    }

    return res
      .type(file.type || 'application/octet-stream')
      .headers({
        'Content-Range': `bytes ${start.toString()}-${end.toString()}/${sizeBigInt.toString()}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': rangeBuffer.length,
        ...(file.originalName
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

  const responseStream = await datasource.get(file.name);
  if (!responseStream) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

  let responseBuffer = await streamToBuffer(responseStream);

  if (needsDecryption) {
    logger.info(`attempting decryption for full file request. buffer size: ${responseBuffer.length}`);
    const decryptedFull = await decryptBuffer(
      responseBuffer,
      config.encryption.key!,
      config.encryption.algorithm,
    );
    if (!decryptedFull) {
      logger.error('decryption failed for full file request', { name: file.name });
      return res.internalServerError('Failed to decrypt file data');
    }
    responseBuffer = decryptedFull;
    logger.info(`decryption successful for full file request. decrypted size: ${responseBuffer.length}`);
  }

  return res
    .type(file.type || 'application/octet-stream')
    .headers({
      'Content-Length': sizeBigInt.toString(),
      'Accept-Ranges': 'bytes',
      ...(file.originalName
        ? {
            'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${encodeURIComponent(file.originalName)}"`,
          }
        : download && {
            'Content-Disposition': 'attachment;',
          }),
    })
    .status(200)
    .send(responseBuffer);
}
