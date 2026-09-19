import { bytes } from '@/lib/bytes';
import { log } from '@/lib/logger';
import { isAdministrator } from '@/lib/role';
import { fastifyCookie } from '@fastify/cookie';
import { fastifyCors } from '@fastify/cors';
import { fastifyMultipart } from '@fastify/multipart';
import { fastifyRateLimit } from '@fastify/rate-limit';
import { fastifySensible } from '@fastify/sensible';
import { fastifyStatic } from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { checkRateLimit } from '../plugins/checkRateLimit';
import oauthPlugin from '../plugins/oauth';
import vitePlugin from '../plugins/vite';
import { registerOpenApi } from './openapi';

const logger = log('server');

export async function registerPlugins(server: FastifyInstance) {
  const config = global.__config__;

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  await registerOpenApi(server);

  await server.register(fastifyCookie, {
    secret: config.core.secret,
    hook: 'onRequest',
  });

  await server.register(fastifyCors);
  await server.register(fastifySensible);

  await server.register(fastifyMultipart, {
    limits: {
      fileSize: bytes(config.files.maxFileSize),
      parts: config.files.maxFilesPerUpload,
    },
  });

  await server.register(fastifyStatic, {
    serve: false,
    root: config.core.tempDirectory,
  });

  await server.register(vitePlugin);
  await server.register(oauthPlugin);

  if (config.ratelimit.enabled) {
    try {
      checkRateLimit(config);

      await server.register(fastifyRateLimit, {
        global: false,
        hook: 'preHandler',
        max: config.ratelimit.max,
        timeWindow: config.ratelimit.window ?? undefined,
        keyGenerator: (req) => {
          const route = req.routeOptions?.url ?? req.url.split('?')[0];
          return `${req.user?.id ?? req.ip}-${route}-${req.method}`;
        },
        allowList: async (req, key) => {
          if (config.ratelimit.adminBypass && isAdministrator(req.user?.role)) return true;
          if (config.ratelimit.allowList.includes(key)) return true;

          return false;
        },
        onExceeded(req, key) {
          logger
            .c('ratelimit')
            .warn(`rate limit exceeded for user ${req.user?.username ?? req.ip ?? 'unknown'}`, {
              key,
            });
        },
      });
    } catch (e) {
      if (process.env.DEBUG) console.error(e);

      logger
        .c('ratelimit')
        .error((e as Error).message)
        .error('skipping ratelimit setup due to error above');
    }
  }
}
