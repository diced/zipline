import express from 'express';
import { join } from 'path';
import { createRequestHandler } from '@remix-run/express';
import { convertEnv } from 'src/lib/config/convert';
import { log } from 'src/lib/logger';
import { readEnv } from 'src/lib/config/read';
import { runMigrations } from 'src/lib/migration';

const MODE = process.env.NODE_ENV || 'production';
const BUILD_DIR = join(process.cwd(), 'build');

const logger = log('server');

logger.info(`starting zipline in ${MODE} mode`);

runMigrations().then(() => {});

const server = express();
const config = convertEnv(readEnv());

server.disable('x-powered-by');

server.use('/modules', express.static('public/build', { maxAge: '1y', immutable: true }));
server.use(express.static('public', { maxAge: '1h' }));

server.all(
  '*',
  MODE === 'production'
    ? createRequestHandler({ build: require(BUILD_DIR) })
    : (...args) => {
        purgeRequireCache();
        const requestHandler = createRequestHandler({
          build: require(BUILD_DIR),
          mode: MODE,
          getLoadContext() {
            return {
              config,
            };
          },
        });
        return requestHandler(...args);
      }
);

server.listen(3000, () => {
  require(BUILD_DIR);

  logger.info(`server listening on port ${config.core.port}`);
});

function purgeRequireCache() {
  for (const key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete require.cache[key];
    }
  }
}
