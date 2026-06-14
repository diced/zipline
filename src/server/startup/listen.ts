import { log } from '@/lib/logger';
import type { FastifyInstance } from 'fastify';
import { lstat, unlink } from 'fs/promises';

const logger = log('server');

export async function unixSocketPath() {
  const config = global.__config__;

  const path = config.core.hostname.trim();
  if (!path.startsWith('/')) return null;

  try {
    const stat = await lstat(path);

    if (!stat.isSocket()) logger.warn('existing file at unix socket path, removing', { path });

    await unlink(path);
    logger.warn('removed existing unix socket before listen', { path });
    return path;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return path;

    logger.warn('error while checking for existing unix socket', { path, error });
    process.exit(1);
  }
}

export async function listenServer(server: FastifyInstance) {
  const config = global.__config__;

  const socketPath = await unixSocketPath();
  if (socketPath) {
    await server.listen({
      path: socketPath,
    });

    logger.info('server started with unix socket', { path: socketPath });
    return;
  }

  await server.listen({
    port: config.core.port,
    host: config.core.hostname,
  });

  logger.info('server started', { hostname: config.core.hostname, port: config.core.port });
}
