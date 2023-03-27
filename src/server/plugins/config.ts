import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { mkdir } from 'fs/promises';
import type { Config } from '../../lib/config/Config';

async function configPlugin(fastify: FastifyInstance, config: Config) {
  fastify.decorate('config', config);

  if (config.core.secret === 'changethis') {
    fastify.logger
      .error('Secret is not set!')
      .error(
        'Running Zipline as is, without a randomized secret is not recommended and leaves your instance at risk!'
      )
      .error('Please change your secret in the config file or environment variables.')
      .error(
        'The config file is located at `.env.local`, or if using docker-compose you can change the variables in the `docker-compose.yml` file.'
      )
      .error('It is recomended to use a secret that is alphanumeric and randomized.')
      .error('A way you can generate this is through a password manager you may have.');

    process.exit(1);
  }

  if (config.datasource.type === 'local') {
    await mkdir(config.datasource.local.directory, { recursive: true });
  }

  return;
}

export default fastifyPlugin(configPlugin, {
  name: 'config',
  fastify: '4.x',
  decorators: {
    fastify: ['logger'],
  },
  dependencies: ['logger'],
});

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
  }
}
