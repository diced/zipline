import { PrismaClient } from '@prisma/client';
import { readdir, readFile } from 'fs/promises';
import { statSync } from 'fs';
import { join } from 'path';
import config from 'lib/config';
import datasource from 'lib/datasource';
import { guess } from 'lib/mimes';
import { migrations } from 'server/util';
import { bytesToHuman } from 'lib/utils/bytes';

async function main() {
  const directory = process.argv[2];
  if (!directory) {
    console.error('no directory specified');
    process.exit(1);
  }

  const files = await readdir(directory);

  const userId = Number(process.argv[3] ?? '1');
  if (isNaN(userId)) {
    console.error('invalid user id');
    process.exit(1);
  }

  const data = [];

  for (let i = 0; i !== files.length; ++i) {
    const mime = await guess(files[i].split('.').pop());
    const { size } = statSync(join(directory, files[i]));

    data.push({
      name: files[i],
      mimetype: mime,
      userId,
      size,
    });

    console.log(`Imported ${files[i]} (${bytesToHuman(size)}) (${mime} mimetype) to user ${userId}`);
  }

  process.env.DATABASE_URL = config.core.database_url;
  await migrations();

  const prisma = new PrismaClient();

  console.log('Starting transaction to database..');
  await prisma.file.createMany({
    data,
  });
  console.log('Finished transaction to database.');

  // copy files to local storage
  console.log(`Copying files to ${config.datasource.type} storage..`);
  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    await datasource.save(file, await readFile(join(directory, file)));
  }
  console.log(`Finished copying files to ${config.datasource.type} storage.`);

  process.exit(0);
}

main();
