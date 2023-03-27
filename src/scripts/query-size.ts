import { PrismaClient } from '@prisma/client';
import config from 'lib/config';
import datasource from 'lib/datasource';
import { migrations } from 'server/util';

async function main() {
  process.env.DATABASE_URL = config.core.database_url;
  await migrations();

  const prisma = new PrismaClient();

  const files = await prisma.file.findMany();

  console.log(`The script will attempt to query the size of ${files.length} files.`);

  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    const size = await datasource.size(file.name);
    if (size === 0) {
      console.log(`File ${file.name} has a size of 0 bytes. Ignoring...`);
    } else {
      console.log(`File ${file.name} has a size of ${size} bytes. Updating...`);
      await prisma.file.update({
        where: {
          id: file.id,
        },
        data: {
          size,
        },
      });
    }
  }

  console.log('Done.');
  process.exit(0);
}

main();
