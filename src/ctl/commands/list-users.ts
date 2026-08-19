import { findFullUserById, listUserRows, userSelect } from '@/lib/db/models/user';

export async function listUsers({ extra, format, id }: { extra?: string[]; format?: boolean; id?: string }) {
  if (extra?.includes('list')) {
    console.log('Listing possible keys:\n' + Object.keys(userSelect).join('\n'));
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
    if (key in userSelect) {
      select[key] = true;
    }
  }

  const rows = await listUserRows(id);
  const users = [];
  for (const row of rows) {
    const full = await findFullUserById(row.id);
    if (!full) continue;

    const selected: Record<string, unknown> = {};
    for (const key of Object.keys(select)) {
      if (key in full) selected[key] = full[key as keyof typeof full];
    }
    users.push(selected);
  }

  console.log(JSON.stringify(users, null, format ? 2 : 0));
  process.exit(0);
}
