import { readdir, readFile, open, rm } from 'fs/promises';
import type { NameFormat } from 'lib/format';
import Logger from 'lib/logger';
import type { UserExtended } from 'middleware/withZipline';
import { tmpdir } from 'os';
import { isMainThread, workerData } from 'worker_threads';

import prisma from 'lib/prisma';
import { join } from 'path';
import { IncompleteFile, InvisibleFile } from '@prisma/client';
import { removeGPSData } from 'lib/utils/exif';
import { sendUpload } from 'lib/discord';
import { createInvisImage, hashPassword } from 'lib/util';
import formatFileName from 'lib/format';

export type UploadWorkerData = {
  user: UserExtended;
  file: {
    filename: string;
    mimetype: string;
    identifier: string;
    lastchunk: boolean;
    totalBytes: number;
  };
  response: {
    expiresAt?: Date;
    format: NameFormat;
    imageCompressionPercent?: number;
    fileMaxViews?: number;
  };
  headers: Record<string, string>;
};

const { user, file, response, headers } = workerData as UploadWorkerData;

const logger = Logger.get('worker::upload').child(file?.identifier ?? 'unknown-ident');

if (isMainThread) {
  logger.error('worker is not a thread');
  process.exit(1);
}

if (!file.lastchunk) {
  logger.error('lastchunk is false, worker should not have been started');
  process.exit(1);
}

start();

async function start() {
  logger.debug('starting worker');

  const partials = await readdir(tmpdir()).then((files) =>
    files.filter((x) => x.startsWith(`zipline_partial_${file.identifier}`))
  );

  const readChunks = partials.map((x) => {
    const [, , , start, end] = x.split('_');
    return { start: Number(start), end: Number(end), filename: x };
  });

  const incompleteFile = await prisma.incompleteFile.create({
    data: {
      data: {
        file,
      },
      chunks: readChunks.length,
      chunksComplete: 0,
      status: 'PENDING',
      userId: user.id,
    },
  });

  const compressionUsed = response.imageCompressionPercent && file.mimetype.startsWith('image/');
  const ext = file.filename.split('.').length === 1 ? '' : file.filename.split('.').pop();
  const fileName = await formatFileName(response.format, file.filename);

  let fd;

  if (config.datasource.type === 'local') {
    fd = await open(
      join(
        process.cwd(),
        config.datasource.local.directory,
        `${fileName}${compressionUsed ? '.jpg' : `${ext ? '.' : ''}${ext}`}`
      ),
      'w'
    );
  } else {
    fd = new Uint8Array(file.totalBytes);
  }

  for (let i = 0; i !== readChunks.length; ++i) {
    const chunk = readChunks[i];

    const buffer = await readFile(join(tmpdir(), chunk.filename));

    if (config.datasource.type === 'local') {
      const { bytesWritten } = await fd.write(buffer, 0, buffer.length, chunk.start);
      logger.child('fd').debug(`wrote ${bytesWritten} bytes to file`);
    } else {
      fd.set(buffer, chunk.start);
      logger.child('bytes').debug(`wrote ${buffer.length} bytes to array`);
    }

    await rm(join(tmpdir(), chunk.filename));

    await prisma.incompleteFile.update({
      where: {
        id: incompleteFile.id,
      },
      data: {
        chunksComplete: {
          increment: 1,
        },
        status: 'PROCESSING',
      },
    });
  }

  if (config.datasource.type === 'local') {
    await fd.close();
  } else {
    logger.debug('writing file to datasource');
    await datasource.save(
      `${fileName}${compressionUsed ? '.jpg' : `${ext ? '.' : ''}${ext}`}`,
      Buffer.from(fd as Uint8Array)
    );
  }

  const final = await prisma.incompleteFile.update({
    where: {
      id: incompleteFile.id,
    },
    data: {
      status: 'COMPLETE',
    },
  });

  logger.debug('done writing file');

  await runFileComplete(fileName, ext, compressionUsed, final);

  logger.debug('done running worker');
  process.exit(0);
}

async function setResponse(incompleteFile: IncompleteFile, code: number, message: string) {
  incompleteFile.data['code'] = code;
  incompleteFile.data['message'] = message;

  return prisma.incompleteFile.update({
    where: {
      id: incompleteFile.id,
    },
    data: {
      data: incompleteFile.data,
    },
  });
}

async function runFileComplete(
  fileName: string,
  ext: string,
  compressionUsed: boolean,
  incompleteFile: IncompleteFile
) {
  if (config.uploader.disabled_extensions.includes(ext))
    return setResponse(incompleteFile, 403, 'disabled extension');

  let password = null;
  if (headers.password) {
    password = await hashPassword(headers.password as string);
  }

  let invis: InvisibleFile;

  const fFile = await prisma.file.create({
    data: {
      name: `${fileName}${compressionUsed ? '.jpg' : `${ext ? '.' : ''}${ext}`}`,
      mimetype: file.mimetype,
      userId: user.id,
      embed: !!headers.embed,
      password,
      expiresAt: response.expiresAt,
      maxViews: response.fileMaxViews,
      originalName: headers['original-name'] ? file.filename ?? null : null,
      size: file.totalBytes,
    },
  });

  if (headers.zws) invis = await createInvisImage(config.uploader.length, fFile.id);

  logger.info(`User ${user.username} (${user.id}) uploaded ${fFile.name} (${fFile.id}) (chunked)`);
  let domain;
  if (headers['override-domain']) {
    domain = `${config.core.return_https ? 'https' : 'http'}://${headers['override-domain']}`;
  } else if (user.domains.length) {
    domain = user.domains[Math.floor(Math.random() * user.domains.length)];
  } else {
    domain = `${config.core.return_https ? 'https' : 'http'}://${headers.host}`;
  }

  const responseUrl = `${domain}${config.uploader.route === '/' ? '/' : config.uploader.route + '/'}${
    invis ? invis.invis : encodeURI(fFile.name)
  }`;

  if (config.discord?.upload) {
    await sendUpload(user, fFile, `${domain}/r/${invis ? invis.invis : fFile.name}`, responseUrl);
  }

  if (config.exif.enabled && config.exif.remove_gps && fFile.mimetype.startsWith('image/')) {
    try {
      await removeGPSData(fFile);
    } catch (e) {
      logger.error(`Failed to remove GPS data from ${fFile.name} (${fFile.id}) - ${e.message}`);
    }
  }

  await setResponse(incompleteFile, 200, responseUrl);
}
