import { ApiUploadResponse, MultipartFileBuffer } from '@/server/routes/api/upload';
import { FastifyRequest } from 'fastify';
import { extname } from 'path';
import { bytes } from '@/lib/bytes';
import { compress } from '@/lib/compress';
import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { onUpload } from '@/lib/webhooks';
import { removeGps } from '@/lib/gps';
import { log } from '@/lib/logger';
import { guess } from '@/lib/mimes';
import { formatFileName } from '@/lib/uploader/formatFileName';
import { UploadHeaders, UploadOptions } from '@/lib/uploader/parseHeaders';

const logger = log('api').c('upload');

export async function handleFile({
  file,
  i,
  options,
  domain,
  response,
  req,
}: {
  file: MultipartFileBuffer;
  i: number;
  options: UploadOptions;
  domain: string;
  response: ApiUploadResponse;
  req: FastifyRequest<{ Headers: UploadHeaders }>;
}) {
  const extension = options.overrides?.extension ?? extname(file.filename);
  if (config.files.disabledExtensions.includes(extension)) throw `File extension ${extension} is not allowed`;

  if (file.file.bytesRead > config.files.maxFileSize)
    throw `File size is too large. Maximum file size is ${config.files.maxFileSize} bytes`;

  const format = options.format || config.files.defaultFormat;
  let fileName = formatFileName(format, file.filename);

  if (options.overrides?.filename || format === 'name') {
    if (options.overrides?.filename) fileName = options.overrides!.filename!;
    const existing = await prisma.file.findFirst({
      where: {
        name: {
          startsWith: fileName,
        },
      },
    });
    if (existing) throw `A file with the name "${fileName}*" already exists`;
  }

  let mimetype = file.mimetype;
  if (mimetype === 'application/octet-stream' && config.files.assumeMimetypes) {
    const mime = await guess(extension.substring(1));

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

    if (!exists) throw 'Folder does not exist';
  }

  let compressed = false;
  if (mimetype.startsWith('image/') && options.imageCompressionPercent) {
    file.buffer = await compress(file.buffer, options.imageCompressionPercent);
    logger.c('jpg').debug(`compressed file ${file.filename}`, {
      nsize: bytes(file.buffer.length),
    });

    compressed = true;
  }

  let removedGps = false;
  if (mimetype.startsWith('image/') && config.files.removeGpsMetadata) {
    removedGps = await removeGps(file.buffer);

    if (removedGps) {
      logger.c('gps').debug(`removed gps metadata from ${file.filename}`);
    }
  }

  const fileUpload = await prisma.file.create({
    data: {
      name: `${fileName}${compressed ? '.jpg' : extension}`,
      size: file.buffer ? file.buffer.length : file.file.bytesRead,
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
      ...(options.addOriginalName && { originalName: file.filename }),
    },
    select: fileSelect,
  });

  await datasource.put(fileUpload.name, file.buffer);

  const responseUrl = `${domain}${
    config.files.route === '/' || config.files.route === '' ? '' : `${config.files.route}`
  }/${fileUpload.name}`;

  response.files.push({
    id: fileUpload.id,
    type: fileUpload.type,
    url: responseUrl,

    ...(removedGps && { removedGps: true }),
    ...(compressed && { compressed: true }),
  });

  logger.info(`${req.user.username} uploaded ${fileUpload.name}`, { size: bytes(fileUpload.size) });

  await onUpload({
    user: req.user,
    file: fileUpload,
    link: {
      raw: `${domain}/raw/${fileUpload.name}`,
      returned: responseUrl,
    },
  });

  return;
}
