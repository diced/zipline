import { ApiUploadResponse, MultipartFileBuffer } from '@/server/routes/api/upload';
import { FastifyRequest } from 'fastify';
import { extname } from 'path';
import { bytes } from '@/lib/bytes';
import { compress } from '@/lib/compress';
import { config } from '@/lib/config';
import { hashPassword, encryptBuffer } from '@/lib/crypto';
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
    removedGps = await removeGps(file.buffer);

    if (removedGps) {
      logger.c('gps').debug(`removed gps metadata from ${file.filename}`);
    }
  }

  // encrypt file
  let fileBuffer = file.buffer;
  let isEncrypted = false;
  let originalSize: bigint | null = null;

  if (config.encryption.enabled && config.encryption.key) {
    try {
      originalSize = BigInt(fileBuffer.length);
      fileBuffer = await encryptBuffer(fileBuffer, config.encryption.key, config.encryption.algorithm);
      isEncrypted = true;
      logger.info(`encrypted file ${file.filename} using ${config.encryption.algorithm}`);
    } catch (e) {
      const errorContext = e instanceof Error ? { error: e.message, stack: e.stack } : { error: String(e) };
      logger.error(`failed to encrypt file ${file.filename}`, errorContext);
      throw 'Failed to encrypt file';
    }
  }

  const fileUpload = await prisma.file.create({
    data: {
      name: `${fileName}${compressed ? '.jpg' : extension}`,
      size: BigInt(fileBuffer.length),
      originalSize: originalSize,
      isEncrypted: isEncrypted,
      type: compressed ? 'image/jpeg' : mimetype,
      User: {
        connect: {
          id: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
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

  await datasource.put(fileUpload.name, fileBuffer, {
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
