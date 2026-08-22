import { hashPassword } from '@/lib/crypto';
import { db } from '@/lib/db';
import { getUserIdentity } from '@/lib/db/models/user';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createUpdateSchema } from 'drizzle-orm/zod';

const userUpdateSchema = createUpdateSchema(users).pick({
  username: true,
  password: true,
  role: true,
  avatar: true,
  token: true,
  totpSecret: true,
});
const supportedFields = new Set(Object.keys(userUpdateSchema.shape));

export async function setUser(property: string, value: string, { id }: { id: string }) {
  if (!supportedFields.has(property)) return console.error('Unsupported field:', property);

  const user = await getUserIdentity(id);

  if (!user) return console.error('User not found');

  let parsed: string | boolean | null = value;

  if (value === 'true') parsed = true;
  else if (value === 'false') parsed = false;

  if (property === 'password') {
    parsed = await hashPassword(value);
  } else if (property === 'role') {
    const valid = ['USER', 'ADMIN', 'SUPERADMIN'];
    if (!valid.includes(value.toUpperCase())) return console.error('Invalid role:', value);
    parsed = value.toUpperCase();
  }

  const update = userUpdateSchema.parse({ [property]: parsed });
  await db.update(users).set(update).where(eq(users.id, id));

  if (property === 'password') parsed = '*********';

  console.log(`updated user(${id}) -> ${property} = ${parsed || value}`);
  process.exit(0);
}
