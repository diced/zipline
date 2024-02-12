import { log } from '../logger';
import { formatFileName } from '../uploader/formatFileName';
import { UploadHeaders, UploadOptions } from '../uploader/parseHeaders';
import { ApiUploadResponse } from '@/pages/api/upload';
import { File, NextApiReq } from '../response';
import { config } from '../config';
import { writeFile } from 'fs/promises';
import { extname, join, parse } from 'path';
import { Worker } from 'worker_threads';
import { prisma } from '../db';
import { guess } from '../mimes';
import { hashPassword } from '../crypto';

const logger = log('api').c('upload');
export async function handlePartialUpload({
  file,
  options,
  domain,
  response,
  req,
}: {
  file: File;
  options: UploadOptions;
  domain: string;
  response: ApiUploadResponse;
  req: NextApiReq<any, any, UploadHeaders>;
}) {
  if (!options.partial) throw 'No partial upload options provided';
  logger.debug('partial upload detected', { partial: options.partial });

  if (!options.partial.identifier || !options.partial.range || options.partial.range.length !== 3)
    throw 'Invalid partial upload';

  const extension = extname(options.partial.filename);
  if (config.files.disabledExtensions.includes(extension)) throw `File extension ${extension} is not allowed`;

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

  let mimetype = options.partial.contentType;
  if (mimetype === 'application/octet-stream' && config.files.assumeMimetypes) {
    const ext = parse(file.originalname).ext.replace('.', '');
    const mime = await guess(ext);

    if (mime) mimetype = mime;
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

  const tempFile = join(
    config.core.tempDirectory,
    `zipline_partial_${options.partial.identifier}_${options.partial.range[0]}_${options.partial.range[1]}`,
  );
  await writeFile(tempFile, file.buffer);

  if (options.partial.lastchunk) {
    const fileUpload = await prisma.file.create({
      data: {
        name: `${fileName}${extension}`,
        size: 0,
        type: mimetype,
        User: {
          connect: {
            id: req.user.id,
          },
        },
        ...(options.password && { password: await hashPassword(options.password) }),
        ...(options.folder && { Folder: { connect: { id: options.folder } } }),
        ...(options.addOriginalName && { originalName: file.originalname }),
      },
    });

    new Worker('./build/offload/partial.js', {
      workerData: {
        user: {
          id: req.user.id,
        },
        file: {
          id: fileUpload.id,
          filename: fileUpload.name,
          type: fileUpload.type,
        },
        options,
        domain,
        responseUrl: `${domain}/${fileUpload.name}`,
      },
    });

    response.files.push({
      id: fileUpload.id,
      type: fileUpload.type,
      url: `${domain}/${fileUpload.name}`,
      pending: true,
    });
  }

  response.partialSuccess = true;
}
