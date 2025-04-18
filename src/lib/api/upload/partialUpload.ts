import { config } from '@/lib/config';
import { hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { guess } from '@/lib/mimes';
import { formatFileName } from '@/lib/uploader/formatFileName';
import { UploadHeaders, UploadOptions } from '@/lib/uploader/parseHeaders';
import { ApiUploadResponse, MultipartFileBuffer } from '@/server/routes/api/upload';
import { FastifyRequest } from 'fastify';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { Worker } from 'worker_threads';
import { getExtension } from './upload';

const logger = log('api').c('upload');
export async function handlePartialUpload({
  file,
  options,
  domain,
  response,
  req,
}: {
  file: MultipartFileBuffer;
  options: UploadOptions;
  domain: string;
  response: ApiUploadResponse;
  req: FastifyRequest<{ Headers: UploadHeaders }>;
}) {
  if (!options.partial) throw 'No partial upload options provided';
  logger.debug('partial upload detected', { partial: options.partial });

  if (!options.partial.identifier || !options.partial.range || options.partial.range.length !== 3)
    throw 'Invalid partial upload';

  const extension = getExtension(options.partial.filename, options.overrides?.extension);

  if (config.files.disabledExtensions.includes(extension)) throw `File extension ${extension} is not allowed`;

  const format = options.format || config.files.defaultFormat;
  let fileName = formatFileName(format, decodeURIComponent(options.partial.filename));

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

  let mimetype = options.partial.contentType;
  if (mimetype === 'application/octet-stream' && config.files.assumeMimetypes) {
    const mime = await guess(extension.substring(1));
    if (mime) mimetype = mime;
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

  const tempFile = join(
    config.core.tempDirectory,
    `zipline_partial_${options.partial.identifier}_${options.partial.range[0]}_${options.partial.range[1]}`,
  );
  await writeFile(tempFile, file.buffer);

  if (options.partial.lastchunk) {
    const fileUpload = await prisma.file.create({
      data: {
        name: `${fileName}${extension}`,
        size: BigInt(0),
        originalSize: options.partial.contentLength ? BigInt(options.partial.contentLength) : null,
        isEncrypted: !!(config.encryption.enabled && config.encryption.key),
        type: mimetype,
        User: {
          connect: {
            id: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
          },
        },
        ...(options.password && { password: await hashPassword(options.password) }),
        ...(options.folder && { Folder: { connect: { id: options.folder } } }),
        ...(options.addOriginalName && {
          originalName: options.partial.filename
            ? decodeURIComponent(options.partial.filename)
            : file.filename,
        }),
      },
    });

    new Worker('./build/offload/partial.js', {
      workerData: {
        user: {
          id: req.user ? req.user.id : options.folder ? folder?.userId : undefined,
        },
        file: {
          id: fileUpload.id,
          filename: fileUpload.name,
          type: fileUpload.type,
        },
        options,
        domain,
        responseUrl: `${domain}/${encodeURIComponent(fileUpload.name)}`,
        encryption: {
          enabled: config.encryption.enabled,
          key: config.encryption.key,
          algorithm: config.encryption.algorithm,
        },
      },
    });

    response.files.push({
      id: fileUpload.id,
      type: fileUpload.type,
      url: `${domain}/${encodeURIComponent(fileUpload.name)}`,
      pending: true,
    });
  }

  response.partialSuccess = true;
}
