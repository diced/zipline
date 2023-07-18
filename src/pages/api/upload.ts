import { config as zconfig } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { file } from '@/lib/middleware/file';
import { method } from '@/lib/middleware/method';
import { ziplineAuth } from '@/lib/middleware/ziplineAuth';
import { guess } from '@/lib/mimes';
import { NextApiReq, NextApiRes } from '@/lib/response';
import { formatFileName } from '@/lib/uploader/formatFileName';
import { UploadHeaders, parseHeaders } from '@/lib/uploader/parseHeaders';
import bytes from 'bytes';
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

    const fileUpload = await prisma.file.create({
      data: {
        name: `${fileName}${extension}`,
        size: file.size,
        type: mimetype,
        User: {
          connect: {
            id: req.user.id,
          },
        },
        // ...(options.maxViews && { maxViews: options.maxViews }),
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

    // TODO: remove gps
    // TODO: zws
    // TODO: image compression

    await datasource.put(fileUpload.name, file.buffer);

    logger.info(`${req.user.username} uploaded ${fileUpload.name}`, { size: bytes(fileUpload.size) });

    const responseUrl = `${domain}${
      zconfig.files.route === '/' || zconfig.files.route === '' ? '' : `${zconfig.files.route}`
    }/${fileUpload.name}`;

    response.files.push({
      id: fileUpload.id,
      type: fileUpload.type,
      url: responseUrl,
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
