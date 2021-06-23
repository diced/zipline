import { PrismaClient } from '@prisma/client';
import { hashPassword, createToken } from '../src/lib/util';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      username: 'administrator',
      password: await hashPassword('password'),
      token: createToken(),
      administrator: true
    }
  });

  console.log(`
When logging into Zipline for the first time, use these credentials:

Username: "${user.username}"
Password: "password"
`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });