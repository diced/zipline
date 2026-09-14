import { log } from '@/lib/logger';
import { version } from '@/lib/version';
import fastifySwagger from '@fastify/swagger';
import type { FastifyInstance } from 'fastify';
import { jsonSchemaTransform, jsonSchemaTransformObject } from 'fastify-type-provider-zod';
import { writeFile } from 'fs/promises';

const logger = log('server');

export async function registerOpenApi(server: FastifyInstance) {
  await server.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Zipline',
        description: 'Zipline API',
        version,
      },
      servers: [],
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });
}

export async function generateOpenApiSpec(server: FastifyInstance) {
  await server.ready();
  const openapi = server.swagger();
  await writeFile('./openapi.json', `${JSON.stringify(openapi, null, 2)}\n`, 'utf8');

  logger.info('OpenAPI schema written to openapi.json');
  process.exit(0);
}
