import { userSelect } from '@/lib/db/models/user';

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

  const { prisma } = await import('@/lib/db');
  const users = await prisma.user.findMany({
    where: id ? { id } : undefined,
    select,
  });

  console.log(JSON.stringify(users, null, format ? 2 : 0));
}
