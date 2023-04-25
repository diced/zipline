import config from 'lib/config';
import { readdir, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

async function main() {
  const temp = config.core.temp_directory;

  if (!existsSync(temp)) {
    console.log('Temp directory does not exist, exiting..');
    process.exit(0);
  }

  const files = (await readdir(temp)).filter((x) => x.startsWith('zipline_partial_'));
  if (files.length === 0) {
    console.log('No partial files found, exiting..');
    process.exit(0);
  } else {
    for (const file of files) {
      console.log(`Deleting ${file}`);
      await rm(join(temp, file));
    }
    console.log('Done!');
    process.exit(0);
  }
}

main();
