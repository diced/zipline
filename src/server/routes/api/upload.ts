import { handlePartialUpload } from '@/lib/api/upload/partialUpload';
import { handleFile } from '@/lib/api/upload/upload';
import { bytes } from '@/lib/bytes';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { UploadHeaders, parseHeaders } from '@/lib/uploader/parseHeaders';
import { userMiddleware } from '@/server/middleware/user';
import { MultipartFile } from '@fastify/multipart';
import fastifyPlugin from 'fastify-plugin';

export type MultipartFileBuffer = MultipartFile & { buffer: Buffer };

export type ApiUploadResponse = {
  files: {
    id: string;
    type: string;
    url: string;
    pending?: boolean;
  }[];

  deletesAt?: string;
  assumedMimetypes?: boolean[];

  partialSuccess?: boolean;
};

const logger = log('api').c('upload');

export const PATH = '/api/upload';
export default fastifyPlugin(
  (server, _, done) => {
    const rateLimit = server.rateLimit();

    server.post<{
      Headers: UploadHeaders;
    }>(PATH, { preHandler: [userMiddleware, rateLimit] }, async (req, res) => {
      const options = parseHeaders(req.headers, config.files);
      if (options.header) return res.badRequest('bad options, receieved: ' + JSON.stringify(options));

      const filesIterable = req.files();
      const files: MultipartFileBuffer[] = [];

      for await (const file of filesIterable) {
        (<MultipartFileBuffer>file).buffer = await file.toBuffer();
        files.push(<MultipartFileBuffer>file);
      }

      if (req.user.quota) {
        const totalFileSize = options.partial
          ? options.partial.contentLength
          : files.reduce((acc, x) => acc + x.file.bytesRead, 0);

        const userAggregateStats = await prisma.file.aggregate({
          where: {
            userId: req.user.id,
          },
          _sum: {
            size: true,
          },
          _count: {
            _all: true,
          },
        });
        const aggSize = userAggregateStats!._sum?.size === null ? 0 : userAggregateStats!._sum?.size;

        if (
          req.user.quota.filesQuota === 'BY_BYTES' &&
          aggSize + totalFileSize > bytes(req.user.quota.maxBytes!)
        )
          return res.payloadTooLarge(
            `uploading will exceed your storage quota of ${bytes(req.user.quota.maxBytes!)} bytes`,
          );

        if (
          req.user.quota.filesQuota === 'BY_FILES' &&
          userAggregateStats!._count?._all + req.files.length > req.user.quota.maxFiles!
        )
          return res.payloadTooLarge(
            `uploading will exceed your file count quota of ${req.user.quota.maxFiles} files`,
          );
      }

      const response: ApiUploadResponse = {
        files: [],
        ...(options.deletesAt && { deletesAt: options.deletesAt.toISOString() }),
        ...(config.files.assumeMimetypes && { assumedMimetypes: Array(req.files.length) }),
      };

      let domain;
      if (options.overrides?.returnDomain) {
        domain = `${config.core.returnHttpsUrls ? 'https' : 'http'}://${options.overrides.returnDomain}`;
      } else if (config.core.defaultDomain) {
        domain = `${config.core.returnHttpsUrls ? 'https' : 'http'}://${config.core.defaultDomain}`;
      } else {
        domain = `${config.core.returnHttpsUrls ? 'https' : 'http'}://${req.headers.host}`;
      }

      logger.debug('uploading files', { files: files.map((x) => x.filename) });

      if (options.partial && config.chunks.enabled) {
        if (files.length > 1) return res.badRequest('partial uploads only support one file field');

        try {
          await handlePartialUpload({
            req,
            file: files[0],
            options,
            domain,
            response,
          });
        } catch (e) {
          console.log(e);

          if (typeof e === 'string') {
            return res.badRequest(e);
          } else {
            logger.error('error while processing partial file ' + e);

            return res.internalServerError('An error occurred while processing the file');
          }
        }

        return res.send(response);
      }

      for (let i = 0; i !== files.length; ++i) {
        try {
          await handleFile({
            file: files[i],
            i,
            options,
            domain,
            response,
            req,
          });
        } catch (e) {
          console.log(e);

          if (typeof e === 'string') {
            return res.badRequest(e);
          } else {
            logger.error('error while processing file ' + e);

            return res.internalServerError('An error occurred while processing the file');
          }
        }
      }

      if (options.noJson)
        return res
          .status(200)
          .type('text/plain')
          .send(response.files.map((x) => x.url).join(','));

      return res.send(response);
    });

    done();
  },
  { name: PATH },
);
