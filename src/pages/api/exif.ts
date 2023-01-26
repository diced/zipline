import { createWriteStream, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import config from 'lib/config';
import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { readMetadata } from 'lib/utils/exif';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';
import { tmpdir } from 'os';
import { join } from 'path';

const logger = Logger.get('exif');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (!config.exif.enabled) return res.forbidden('exif disabled');

  const { id } = req.query as { id: string };
  if (!id) return res.badRequest('no id');

  const image = await prisma.file.findFirst({
    where: {
      id: Number(id),
      userId: user.id,
    },
  });

  if (!image) return res.notFound('image not found');

  logger.info(
    `${user.username} (${user.id}) requested to read exif metadata for image ${image.name} (${image.id})`
  );

  if (config.datasource.type === 'local') {
    const filePath = join(config.datasource.local.directory, image.name);
    logger.debug(`attemping to read exif metadata from ${filePath}`);

    if (!existsSync(filePath)) return res.notFound('image not found on fs');

    const data = await readMetadata(filePath);
    logger.debug(`exif(${filePath}) -> ${JSON.stringify(data)}`);

    return res.json(data);
  } else {
    const file = join(tmpdir(), `zipline-exif-read-${Date.now()}-${image.name}`);
    logger.debug(`writing temp file to view metadata: ${file}`);

    const stream = await datasource.get(image.name);
    const writeStream = createWriteStream(file);
    stream.pipe(writeStream);

    await new Promise((resolve) => writeStream.on('finish', resolve));

    const data = await readMetadata(file);
    logger.debug(`exif(${file}) -> ${JSON.stringify(data)}`);

    await unlink(file);
    logger.debug(`removing temp file: ${file}`);

    return res.json(data);
  }
}

export default withZipline(handler, {
  methods: ['GET'],
  user: true,
});
