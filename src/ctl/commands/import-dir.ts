import { bytes } from '@/lib/bytes';
import { config, reloadSettings } from '@/lib/config';
import { getDatasource } from '@/lib/datasource';
import { db } from '@/lib/db';
import { getOwnedFolder } from '@/lib/db/models/folder';
import { files, users } from '@/lib/db/schema';
import { guess } from '@/lib/mimes';
import { eq } from 'drizzle-orm';
import { statSync } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import { join, parse, resolve } from 'path';

export async function importDir(
  directory: string,
  { id, folder, skipDb }: { id?: string; folder?: string; skipDb?: boolean },
) {
  const fullPath = resolve(directory);
  if (!statSync(fullPath).isDirectory()) return console.error('Not a directory:', directory);

  await reloadSettings();

  let userId: string;

  if (id) {
    userId = id;
  } else {
    const [candidate] = await db
      .select({ id: users.id, username: users.username, role: users.role })
      .from(users)
      .where(eq(users.username, 'administrator'))
      .limit(1);
    const user = candidate?.role === 'SUPERADMIN' ? candidate : null;

    if (!user) {
      const [firstSuperAdmin] = await db
        .select({ id: users.id, username: users.username, role: users.role })
        .from(users)
        .where(eq(users.role, 'SUPERADMIN'))
        .limit(1);

      if (!firstSuperAdmin) return console.error('No superadmin found or "administrator" user.');

      userId = firstSuperAdmin.id;

      console.log('No "administrator" found, using', firstSuperAdmin.username);
    } else {
      userId = user.id;
    }
  }

  if (folder) {
    const exists = await getOwnedFolder(folder, userId);

    if (!exists) return console.error('Folder not found:', folder);
  }

  const dirents = await readdir(fullPath);
  const filenames = dirents.filter((filename) => !parse(filename).base.startsWith('.thumbnail'));
  const data = [];

  for (let i = 0; i !== filenames.length; ++i) {
    const info = parse(filenames[i]);

    const mime = await guess(info.ext.replace('.', ''));
    const { size } = statSync(join(fullPath, filenames[i]));

    data.push({
      name: info.base,
      type: mime,
      size,
      userId,
      ...(folder ? { folderId: folder } : {}),
    });
  }

  if (!skipDb) {
    let created: { id: string }[] = [];
    if (data.length) {
      const insertedFiles = await db.insert(files).values(data).returning({ id: files.id });
      created = insertedFiles;
    }
    console.log(`Inserted ${created.length} files into the database.`);
  }

  const totalSize = data.reduce((acc, file) => acc + file.size, 0);
  let completed = 0;
  let imported = 0;

  if (config.datasource.type === 'local')
    await mkdir(config.datasource.local!.directory, { recursive: true });

  const datasource = getDatasource(config);
  if (!datasource) return console.error('No datasource configured');

  for (let i = 0; i !== data.length; ++i) {
    if (!data[i]) continue;

    console.log(`Uploading ${data[i].name} (${bytes(data[i].size)})...`);

    const start = process.hrtime();

    await datasource.put(data[i].name, join(fullPath, filenames[i]), {
      mimetype: data[i].type ?? 'application/octet-stream',
      noDelete: true,
    });

    const diff = process.hrtime(start);

    const time = diff[0] * 1e9 + diff[1];
    const timeStr = time > 1e9 ? `${(time / 1e9).toFixed(2)}s` : `${(time / 1e6).toFixed(2)}ms`;

    const uploadSpeed = (data[i].size / time) * 1e9;
    const uploadSpeedStr =
      uploadSpeed > 1e9 ? `${(uploadSpeed / 1e9).toFixed(2)} GB/s` : `${(uploadSpeed / 1e6).toFixed(2)} MB/s`;

    completed += data[i].size;

    console.log(
      `Uploaded ${data[i].name} in ${timeStr} (${bytes(data[i].size)}) ${i + 1}/${filenames.length} ${bytes(completed)}/${bytes(totalSize)} ${uploadSpeedStr}`,
    );

    ++imported;
  }

  console.log(`Done importing ${imported} files.`);

  process.exit(0);
}
