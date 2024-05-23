import { existsSync } from 'fs';
import { log } from '../logger';
import { config } from '../config';
import { readdir, rm } from 'fs/promises';
import { join } from 'path';

const logger = log('serverutil').c('clearTemp');

export async function clearTemp(): Promise<string> {
  logger.info('preparing to clear temp files');

  if (!existsSync(config.core.tempDirectory)) {
    logger.info('temp directory does not exist');
    return 'Temp directory does not exist, so no files were cleared.';
  }

  const files = await readdir(config.core.tempDirectory);
  if (files.length === 0) {
    logger.info('no temporary zipline files found');
    return 'No temporary zipline files found, so no files were cleared.';
  }

  for (const file of files) {
    await rm(join(config.core.tempDirectory, file));
    logger.info('deleted temp file', { file });
  }

  logger.info('cleared temp files', { count: files.length });
  return `Cleared ${files.length} temporary zipline files.`;
}
