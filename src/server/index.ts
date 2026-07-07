import { reloadSettings } from '@/lib/config';
import { checkDbVars, REQUIRED_DB_VARS } from '@/lib/config/read/env';
import { getDatasource } from '@/lib/datasource';
import { runMigrations } from '@/lib/db/migration';
import { log } from '@/lib/logger';
import type { Tasks } from '@/lib/tasks';
import { version } from '@/lib/version';
import fastify from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { mkdir } from 'fs/promises';
import { registerHandlers } from './startup/handlers';
import { listenServer } from './startup/listen';
import { startMemoryLog } from './startup/memory';
import { generateOpenApiSpec } from './startup/openapi';
import { registerPlugins } from './startup/plugins';
import { registerRoutes } from './startup/routes';
import { startTasks } from './startup/tasks';

const MODE = process.env.NODE_ENV || 'production';
const logger = log('server');

declare global {
  interface BigInt {
    toJSON(): number;
  }
}

BigInt.prototype.toJSON = function () {
  return Number(this.toString());
};

async function main() {
  const argv = process.argv.slice(2);
  logger.info('starting zipline', { mode: MODE, version: version, argv });

  if (!checkDbVars()) {
    logger.error(`either DATABASE_URL or all of [${REQUIRED_DB_VARS.join(', ')}] not set, exiting...`);
    process.exit(1);
  }

  await runMigrations();

  logger.info('reading settings...');
  await reloadSettings();

  const config = global.__config__;
  getDatasource(config);

  if (config.datasource.type === 'local') {
    await mkdir(config.datasource.local!.directory, { recursive: true });
  }

  await mkdir(config.core.tempDirectory, { recursive: true });

  logger.debug('creating server', {
    port: config.core.port,
    hostname: config.core.hostname,
    trustProxy: config.core.trustProxy,
  });

  const server = fastify({
    trustProxy: config.core.trustProxy,
  }).withTypeProvider<ZodTypeProvider>();

  await registerPlugins(server);
  registerHandlers(server, MODE);
  await registerRoutes(server, MODE);

  if (process.env.ZIPLINE_OUTPUT_OPENAPI === 'true') generateOpenApiSpec(server);

  startTasks(server);
  await listenServer(server);

  if (process.env.ZIPLINE_MONITOR_MEMORY === 'true') startMemoryLog();
}

main();

declare module 'fastify' {
  interface FastifyInstance {
    tasks: Tasks;
  }
}

declare module 'node:http' {
  interface IncomingMessage {
    body?: any;
  }
}
