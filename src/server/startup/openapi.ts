import { log } from '@/lib/logger';
import type { FastifyInstance } from 'fastify';
import { writeFile } from 'fs/promises';

const logger = log('server');

export function generateOpenApiSpec(server: FastifyInstance) {
  server.ready(async () => {
    const openapi = server.swagger();
    await writeFile('./openapi.json', JSON.stringify(openapi, null, 2), 'utf8');

    logger.info('OpenAPI schema written to openapi.json');
    process.exit(0);
  });
}
