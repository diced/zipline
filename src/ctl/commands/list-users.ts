import { listUserDetails, userSchema } from '@/lib/db/models/user';

const selectableUserKeys = new Set(Object.keys(userSchema.shape));

export async function listUsers({ extra, format, id }: { extra?: string[]; format?: boolean; id?: string }) {
  if (extra?.includes('list')) {
    console.log('Listing possible keys:\n' + [...selectableUserKeys].join('\n'));
    return;
  }

  const select: Record<string, boolean> = {
    id: true,
    username: true,
    createdAt: true,
    updatedAt: true,
    role: true,
  };

  for (const key of extra || []) {
    if (selectableUserKeys.has(key)) {
      select[key] = true;
    }
  }

  const rows = await listUserDetails({ id, avatar: extra?.includes('avatar') });
  const users = [];
  for (const full of rows) {
    const selected: Record<string, unknown> = {};
    for (const key of Object.keys(select)) {
      if (key in full) selected[key] = full[key as keyof typeof full];
    }
    users.push(selected);
  }

  console.log(JSON.stringify(users, null, format ? 2 : 0));
  process.exit(0);
}
