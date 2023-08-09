import { bytes } from '@/lib/bytes';
import { compress } from '@/lib/compress';
import { config as zconfig } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { removeGps } from '@/lib/gps';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { file } from '@/lib/middleware/file';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { guess } from '@/lib/mimes';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { formatFileName } from '@/lib/uploader/formatFileName';
import { UploadHeaders, parseHeaders } from '@/lib/uploader/parseHeaders';
import { extname, parse } from 'path';

export type ApiUploadResponse = {
  files: {
    id: string;
    type: string;
    url: string;
  }[];

  deletesAt?: string;
  assumedMimetypes?: boolean[];
};

const logger = log('api').c('upload');

export async function handler(req: NextApiReq<any, any, UploadHeaders>, res: NextApiRes<ApiUploadResponse>) {
  if (!req.files || !req.files.length) return res.badRequest('No files received');

  const options = parseHeaders(req.headers, zconfig.files);

  if (options.header) return res.badRequest('', options);

  const response: ApiUploadResponse = {
    files: [],
    ...(options.deletesAt && { deletesAt: options.deletesAt.toISOString() }),
    ...(zconfig.files.assumeMimetypes && { assumedMimetypes: Array(req.files.length) }),
  };

  let domain;
  if (options.overrides?.returnDomain) {
    domain = `${zconfig.core.returnHttpsUrls ? 'https' : 'http'}://${options.overrides.returnDomain}`;
  } else {
    domain = `${zconfig.core.returnHttpsUrls ? 'https' : 'http'}://${req.headers.host}`;
  }

  for (let i = 0; i !== req.files.length; ++i) {
    const file = req.files[i];
    const extension = extname(file.originalname);

    if (zconfig.files.disabledExtensions.includes(extension))
      return res.badRequest(`File extension ${extension} is not allowed`);

    if (file.size > zconfig.files.maxFileSize)
      return res.badRequest(
        `File size is too large. Maximum file size is ${zconfig.files.maxFileSize} bytes`
      );

    let fileName = formatFileName(options.format || zconfig.files.defaultFormat, file.originalname);

    if (options.overrides?.filename) {
      fileName = options.overrides!.filename!;
      const existing = await prisma.file.findFirst({
        where: {
          name: {
            startsWith: fileName,
          },
        },
      });
      if (existing) return res.badRequest(`A file with the name "${fileName}*" already exists`);
    }

    let mimetype = file.mimetype;
    if (mimetype === 'application/octet-stream' && zconfig.files.assumeMimetypes) {
      const ext = parse(file.originalname).ext.replace('.', '');
      const mime = await guess(ext);

      if (!mime) response.assumedMimetypes![i] = false;
      else {
        response.assumedMimetypes![i] = true;
        mimetype = mime;
      }
    }

    if (options.folder) {
      const exists = await prisma.folder.findFirst({
        where: {
          id: options.folder,
          userId: req.user.id,
        },
      });

      if (!exists) return res.badRequest('Folder does not exist');
    }

    let compressed = false;
    if (mimetype.startsWith('image/') && options.imageCompressionPercent) {
      const buffer = await compress(file.buffer, options.imageCompressionPercent);
      logger.c('jpg').debug(`compressed file ${file.originalname}`, {
        osize: bytes(file.buffer.length),
        nsize: bytes(buffer.length),
      });

      file.buffer = buffer;
      compressed = true;
    }

    let removedGps = false;
    if (mimetype.startsWith('image/') && zconfig.files.removeGpsMetadata) {
      removedGps = await removeGps(file.buffer);
      if (removedGps) {
        logger.c('gps').debug(`removed gps metadata from ${file.originalname}`);
      }
    }

    const fileUpload = await prisma.file.create({
      data: {
        name: `${fileName}${compressed ? '.jpg' : extension}`,
        size: file.buffer.length,
        type: compressed ? 'image/jpeg' : mimetype,
        User: {
          connect: {
            id: req.user.id,
          },
        },
        ...(options.maxViews && { maxViews: options.maxViews }),
        ...(options.password && { password: await hashPassword(options.password) }),
        ...(options.deletesAt && { deletesAt: options.deletesAt }),
        ...(options.folder && { Folder: { connect: { id: options.folder } } }),
        ...(options.addOriginalName && { originalName: file.originalname }),
      },
      select: {
        name: true,
        id: true,
        type: true,
        size: true,
      },
    });

    await datasource.put(fileUpload.name, file.buffer);

    logger.info(`${req.user.username} uploaded ${fileUpload.name}`, { size: bytes(fileUpload.size) });

    const responseUrl = `${domain}${
      zconfig.files.route === '/' || zconfig.files.route === '' ? '' : `${zconfig.files.route}`
    }/${fileUpload.name}`;

    response.files.push({
      id: fileUpload.id,
      type: fileUpload.type,
      url: responseUrl,

      ...(removedGps && { removedGps: true }),
      ...(compressed && { compressed: true }),
    });
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
