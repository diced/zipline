import { PrismaClient } from '@prisma/client';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import config from 'lib/config';
import datasource from 'lib/datasource';
import { guess } from 'lib/mimes';
import { migrations } from 'server/util';

async function main() {
  process.env.DATABASE_URL = config.core.database_url;
  await migrations();

  const prisma = new PrismaClient();

  const files = await prisma.file.findMany();

  const toDelete = [];

  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    const size = await datasource.size(file.name);
    if (size === 0) {
      toDelete.push(file.name);
    }
  }

  if (toDelete.length === 0) {
    console.log('No files to delete.');
    process.exit(0);
  }

  process.stdout.write(`Found ${toDelete.length} files to delete. Continue? (y/N) `);
  const answer: Buffer = await new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (text) => {
      resolve(text);
    });
  });

  if (answer.toString().trim().toLowerCase() !== 'y') {
    console.log('Aborting.');
    process.exit(0);
  }

  const { count } = await prisma.file.deleteMany({
    where: {
      name: {
        in: toDelete,
      },
    },
  });
  console.log(`Deleted ${count} files from the database.`);

  for (let i = 0; i !== toDelete.length; ++i) {
    await datasource.delete(toDelete[i]);
  }

  console.log(`Deleted ${toDelete.length} files from the storage.`);

  process.exit(0);
}

main();
