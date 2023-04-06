import { PrismaClient } from '@prisma/client';
import config from 'lib/config';
import datasource from 'lib/datasource';
import { migrations } from 'server/util';

async function main() {
  process.env.DATABASE_URL = config.core.database_url;
  await migrations();

  const prisma = new PrismaClient();
  let notFound = false;

  const files = await prisma.file.findMany({
    ...(process.argv.includes('--force-update')
      ? undefined
      : {
          where: {
            size: 0,
          },
        }),
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`The script will attempt to query the size of ${files.length} files.`);

  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    if (!datasource.get(file.name)) {
      if (process.argv.includes('--force-delete')) {
        console.log(`File ${file.name} does not exist. Deleting...`);
        await prisma.file.delete({
          where: {
            id: file.id,
          },
        });
        continue;
      } else {
        notFound ? null : (notFound = true);
        continue;
      }
    }

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

  notFound
    ? console.log(
        'At least one file has been found to not exist in the datasource but was on the database. To remove these files, run the script with the --force-delete flag.'
      )
    : console.log('Done.');
  process.exit(0);
}

main();
