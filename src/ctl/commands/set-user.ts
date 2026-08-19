import { hashPassword } from '@/lib/crypto';
import { findUserRowById, updateUserRow, type UserUpdate } from '@/lib/db/models/user';
const SUPPORTED_FIELDS = ['username', 'password', 'role', 'avatar', 'token', 'totpSecret'];

export async function setUser(property: string, value: string, { id }: { id: string }) {
  if (!SUPPORTED_FIELDS.includes(property)) return console.error('Unsupported field:', property);

  const user = await findUserRowById(id);

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

  await updateUserRow(id, { [property]: parsed } as UserUpdate);

  if (property === 'password') parsed = '*********';

  console.log(`updated user(${id}) -> ${property} = ${parsed || value}`);
  process.exit(0);
}
