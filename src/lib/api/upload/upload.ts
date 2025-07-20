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

const commonDoubleExts = [
  '.tar.gz',
  '.tar.xz',
  '.tar.bz2',
  '.tar.lz',
  '.tar.lzma',
  '.tar.Z',
  '.tar.7z',
  '.zip.gz',
  '.zip.xz',
  '.rar.gz',
  '.log.gz',
  '.csv.gz',
  '.pdf.gz',
  // feel free to PR more
];

export const getExtension = (filename: string, override?: string): string => {
  return override ?? commonDoubleExts.find((ext) => filename.endsWith(ext)) ?? extname(filename);
};

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
  const extension = getExtension(file.filename, options.overrides?.extension);

  if (config.files.disabledExtensions.includes(extension)) throw `File extension ${extension} is not allowed`;

  if (file.file.bytesRead > bytes(config.files.maxFileSize))
    throw `File size is too large. Maximum file size is ${bytes(config.files.maxFileSize)} bytes`;

  const format = options.format || config.files.defaultFormat;
  let fileName = formatFileName(format, file.filename);

  if (options.overrides?.filename || format === 'name') {
    if (options.overrides?.filename) fileName = decodeURIComponent(options.overrides!.filename!);
    const fullFileName = `${fileName}${extension}`;

    const existing = await prisma.file.findFirst({
      where: {
        name: fullFileName,
      },
    });
    if (existing) throw `A file with the name "${fullFileName}" already exists`;
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

  let folder = null;
  if (options.folder) {
    folder = await prisma.folder.findFirst({
      where: {
        id: options.folder,
      },
    });

    if (!folder) throw 'Folder does not exist';

    if (!folder.allowUploads && folder.userId !== req.user?.id) throw 'Folder is not open';
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
    const removed = removeGps(file.buffer);

    if (removed) {
      logger.c('gps').debug(`removed gps metadata from ${file.filename}`, {
        nsize: bytes(file.buffer.length),
        osize: bytes(file.file.bytesRead),
      });

      removedGps = true;
    }
  }

  const fileUpload = await prisma.file.create({
    data: {
      name: `${fileName}${compressed ? '.jpg' : extension}`,
      size: file.buffer ? file.buffer.length : file.file.bytesRead,
      type: compressed ? 'image/jpeg' : mimetype,
      User: {
        connect: {
          id: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
        },
      },
      ...(options.maxViews && { maxViews: options.maxViews }),
      ...(options.password && { password: await hashPassword(options.password) }),
      ...(options.deletesAt && options.deletesAt !== 'never'
        ? { deletesAt: options.deletesAt }
        : { deletesAt: null }),
      ...(options.folder && { Folder: { connect: { id: options.folder } } }),
      ...(options.addOriginalName && { originalName: file.filename }),
    },
    select: fileSelect,
  });

  await datasource.put(fileUpload.name, file.buffer, {
    mimetype: fileUpload.type,
  });

  const responseUrl = `${domain}${
    config.files.route === '/' || config.files.route === '' ? '' : `${config.files.route}`
  }/${fileUpload.name}`;

  response.files.push({
    id: fileUpload.id,
    type: fileUpload.type,
    url: encodeURI(responseUrl),

    ...(removedGps && { removedGps: true }),
    ...(compressed && { compressed: true }),
  });

  logger.info(`${req.user ? req.user.username : '[anonymous folder upload]'} uploaded ${fileUpload.name}`, {
    size: bytes(fileUpload.size),
    ip: req.ip,
  });

  await onUpload({
    user: req.user ?? {
      id: 'anonymous',
      username: 'anonymous',
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'USER',
    },
    file: fileUpload,
    link: {
      raw: `${domain}/raw/${encodeURIComponent(fileUpload.name)}`,
      returned: encodeURI(responseUrl),
    },
  });

  return;
}
