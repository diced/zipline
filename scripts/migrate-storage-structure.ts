import { getFilePath } from '@/lib/datasource/helpers';
import { prisma } from '@/lib/db';
import { reloadSettings, config } from '@/lib/config';
import { existsSync, renameSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

async function main() {
  await reloadSettings();
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Starting migration... ${dryRun ? '(DRY RUN)' : ''}`);

  // Let's rely on config.datasource.local.directory if it exists, or ./uploads
  const targetDir = config.datasource.local.directory || './uploads';

  if (!existsSync(targetDir)) {
    console.error(`Uploads directory not found at ${targetDir}`);
    process.exit(1);
  }

  const files = await prisma.file.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      userId: true,
    },
  });

  console.log(`Found ${files.length} files to migrate.`);

  let success = 0;
  let errors = 0;

  for (const file of files) {
    const oldPath = join(targetDir, file.name);

    if (!existsSync(oldPath)) {
      console.warn(`File not found on disk: ${file.name} (ID: ${file.id})`);
      errors++;
      continue;
    }

    const relativeNewPath = getFilePath({ userId: file.userId, type: file.type, name: file.name });
    const newPath = join(targetDir, relativeNewPath);
    const newDir = resolve(newPath, '..');

    if (dryRun) {
      console.log(`[DRY RUN] Would move ${oldPath} -> ${newPath}`);
      success++;
    } else {
      try {
        if (!existsSync(newDir)) {
          mkdirSync(newDir, { recursive: true });
        }
        renameSync(oldPath, newPath);
        console.log(`Moved ${file.name} -> ${relativeNewPath}`);
        success++;
      } catch (e) {
        console.error(`Failed to move ${file.name}:`, e);
        errors++;
      }
    }
  }

  console.log('Migration complete.');
  console.log(`Success: ${success}`);
  console.log(`Errors: ${errors}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
