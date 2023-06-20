import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';
import config from 'lib/config';
import { migrations } from 'server/util';

const SUPPORTED_FIELDS = [
  'username',
  'password',
  'administrator',
  'avatar',
  'token',
  'superAdmin',
  'systemTheme',
  'embed',
  'ratelimit',
  'domains',
];

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) return console.error('no user id specified (run list-users script to see all user ids)');
  if (!args[1]) return console.error('no property specified');
  if (!args[2]) return console.error('no value specified');

  if (!SUPPORTED_FIELDS.includes(args[1])) return console.error(`property ${args[1]} is not supported`);

  process.env.DATABASE_URL = config.core.database_url;
  await migrations();

  const prisma = new PrismaClient();

  const user = await prisma.user.findFirst({
    where: {
      id: Number(args[0]),
    },
  });
  if (!user) return console.error('user not found');

  let parsed;

  if (args[2] === 'true') parsed = true;
  if (args[2] === 'false') parsed = false;

  if (args[1] === 'password') {
    parsed = await hash(args[2]);
  }

  if (args[1] === 'domains') {
    parsed = args[2].split(',');
  }

  if (args[1] === 'ratelimit') {
    const try_date = new Date(args[2]);
    if (isNaN(try_date.getTime())) return console.error('invalid date');
    parsed = try_date;
  }

  const data = {
    [args[1]]: parsed,
  };

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data,
  });

  await prisma.$disconnect();

  if (args[1] === 'password') {
    parsed = '***';
  }

  console.log(`Updated user ${user.id} with ${args[1]} = ${parsed}`);

  process.exit(0);
}

main();
