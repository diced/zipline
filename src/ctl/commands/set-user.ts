import { hashPassword } from '@/lib/crypto';
const SUPPORTED_FIELDS = ['username', 'password', 'role', 'avatar', 'token', 'totpSecret'];

export async function setUser(property: string, value: string, { id }: { id: string }) {
  if (!SUPPORTED_FIELDS.includes(property)) return console.error('Unsupported field:', property);

  const { prisma } = await import('@/lib/db');
  const user = await prisma.user.findFirst({
    where: { id },
  });

  if (!user) return console.error('User not found');

  let parsed;

  if (value === 'true') parsed = true;
  else if (value === 'false') parsed = false;

  if (property === 'password') {
    parsed = await hashPassword(value);
  } else if (property === 'role') {
    const valid = ['USER', 'ADMIN', 'SUPERADMIN'];
    if (!valid.includes(value.toUpperCase())) return console.error('Invalid role:', value);
    parsed = value.toUpperCase();
  }

  await prisma.user.update({
    where: { id },
    data: {
      [property]: parsed,
    },
  });

  if (property === 'password') parsed = '*********';

  console.log(`updated user(${id}) -> ${property} = ${parsed || value}`);
}
