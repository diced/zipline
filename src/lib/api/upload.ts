import { extname, parse } from 'path';
import { config } from '../config';
import { prisma } from '../db';
import { File, NextApiReq } from '../response';
import { formatFileName } from '../uploader/formatFileName';
import { UploadHeaders, UploadOptions } from '../uploader/parseHeaders';
import { guess } from '../mimes';
import { ApiUploadResponse } from '@/pages/api/upload';
import { compress } from '../compress';
import { bytes } from '../bytes';
import { log } from '../logger';
import { removeGps } from '../gps';
import { hashPassword } from '../crypto';
import { fileSelect } from '../db/models/file';
import { datasource } from '../datasource';
import { onUpload } from '../discord';

const logger = log('api').c('upload');

export async function handleFile({
  file,
  i,
  options,
  domain,
  response,
  req,
}: {
  file: File;
  i: number;
  options: UploadOptions;
  domain: string;
  response: ApiUploadResponse;
  req: NextApiReq<any, any, UploadHeaders>;
}) {
  const extension = extname(file.originalname);

  if (config.files.disabledExtensions.includes(extension)) throw `File extension ${extension} is not allowed`;

  if (file.size > config.files.maxFileSize)
    throw `File size is too large. Maximum file size is ${config.files.maxFileSize} bytes`;

  let fileName = formatFileName(options.format || config.files.defaultFormat, file.originalname);

  if (options.overrides?.filename) {
    fileName = options.overrides!.filename!;
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

    if (!exists) throw 'Folder does not exist';
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
  if (mimetype.startsWith('image/') && config.files.removeGpsMetadata) {
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
