import { PrismaClient } from '@prisma/client';
import config from 'lib/config';
import { migrations } from 'server/util';

async function main() {
  const extras = (process.argv[2] ?? '').split(',');
  const specificId = process.argv[3] ?? null;

  const where = {
    id: specificId ? Number(specificId) : null,
  };

  const select = {
    username: true,
    administrator: true,
    id: true,
  };
  for (let i = 0; i !== extras.length; ++i) {
    const e = extras[i];
    if (e) select[e] = true;
  }

  process.env.DATABASE_URL = config.core.database_url;
  await migrations();

  const prisma = new PrismaClient();

  const users = await prisma.user.findMany({
    where: specificId ? where : undefined,
    select,
  });

  console.log(JSON.stringify(users, null, 2));
}

main();
