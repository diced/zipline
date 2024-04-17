import { handlePartialUpload } from '@/lib/api/partialUpload';
import { handleFile } from '@/lib/api/upload';
import { bytes } from '@/lib/bytes';
import { config as zconfig } from '@/lib/config';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { file } from '@/lib/middleware/file';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { UploadHeaders, parseHeaders } from '@/lib/uploader/parseHeaders';

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

export async function handler(req: NextApiReq<any, any, UploadHeaders>, res: NextApiRes<ApiUploadResponse>) {
  if (!req.files || !req.files.length) return res.badRequest('No files received');

  const options = parseHeaders(req.headers, zconfig.files);

  if (options.header) return res.badRequest('', options);

  if (req.user.quota) {
    const totalFileSize = options.partial
      ? options.partial.contentLength
      : req.files.reduce((acc, x) => acc + x.size, 0);

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

    if (req.user.quota.filesQuota === 'BY_BYTES' && aggSize + totalFileSize > bytes(req.user.quota.maxBytes!))
      return res.tooLarge(
        `uploading will exceed your storage quota of ${bytes(req.user.quota.maxBytes!)} bytes`,
      );

    if (
      req.user.quota.filesQuota === 'BY_FILES' &&
      userAggregateStats!._count?._all + req.files.length > req.user.quota.maxFiles!
    )
      return res.tooLarge(`uploading will exceed your file count quota of ${req.user.quota.maxFiles} files`);
  }

  const response: ApiUploadResponse = {
    files: [],
    ...(options.deletesAt && { deletesAt: options.deletesAt.toISOString() }),
    ...(zconfig.files.assumeMimetypes && { assumedMimetypes: Array(req.files.length) }),
  };

  let domain;
  if (options.overrides?.returnDomain) {
    domain = `${zconfig.core.returnHttpsUrls ? 'https' : 'http'}://${options.overrides.returnDomain}`;
  } else if (zconfig.core.defaultDomain) {
    domain = `${zconfig.core.returnHttpsUrls ? 'https' : 'http'}://${zconfig.core.defaultDomain}`;
  } else {
    domain = `${zconfig.core.returnHttpsUrls ? 'https' : 'http'}://${req.headers.host}`;
  }

  logger.debug('uploading files', { files: req.files.map((x) => x.originalname) });

  if (options.partial && zconfig.chunks.enabled) {
    try {
      await handlePartialUpload({
        req,
        file: req.files[0],
        options,
        domain,
        response,
      });
    } catch (e) {
      if (typeof e === 'string') {
        return res.badRequest(e);
      } else {
        logger.error('error while processing partial file ' + e);

        return res.serverError('An error occurred while processing the file');
      }
    }

    return res.ok(response);
  }

  for (let i = 0; i !== req.files.length; ++i) {
    const file = req.files[i];

    try {
      await handleFile({
        file,
        i,
        options,
        domain,
        response,
        req,
      });
    } catch (e) {
      if (typeof e === 'string') {
        return res.badRequest(e);
      } else {
        logger.error('error while processing file ' + e);

        return res.serverError('An error occurred while processing the file');
      }
    }
  }

  if (options.noJson)
    return res
      .status(200)
      .setHeader('content-type', 'text/plain')
      .end(response.files.map((x) => x.url).join(','));

  return res.ok(response);
}

export default combine([method(['POST']), ziplineAuth(), file()], handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
