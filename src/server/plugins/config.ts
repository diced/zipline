import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { existsSync } from 'fs';
import { mkdir, readdir } from 'fs/promises';
import type { Config } from 'lib/config/Config';

async function configPlugin(fastify: FastifyInstance, config: Config) {
  fastify.decorate('config', config);

  if (config.core.secret === 'changethis') {
    fastify.logger
      .error('Secret is not set!')
      .error(
        'Running Zipline as is, without a randomized secret is not recommended and leaves your instance at risk!',
      )
      .error('Please change your secret in the config file or environment variables.')
      .error(
        'The config file is located at `.env.local`, or if using docker-compose you can change the variables in the `docker-compose.yml` file.',
      )
      .error(
        'It is recomended to use a secret that is alphanumeric and randomized. If you include special characters, surround the secret with quotes.',
      )
      .error('A way you can generate this is through a password manager you may have.');

    process.exit(1);
  }

  if (config.datasource.type === 'local') {
    await mkdir(config.datasource.local.directory, { recursive: true });
  }

  if (!existsSync(config.core.temp_directory)) {
    await mkdir(config.core.temp_directory, { recursive: true });
  } else {
    const files = await readdir(config.core.temp_directory);
    if (
      files.filter((x: string) => x.startsWith('zipline_partial_') || x.startsWith('zipline-exif-read-'))
        .length > 0
    )
      fastify.logger
        .error("Found temporary files in Zipline's temp directory.")
        .error('This can happen if Zipline crashes or is stopped while chunking a file.')
        .error(
          'If you are sure that no files are currently being processed, you can delete the files in the temp directory.',
        )
        .error('The temp directory is located at: ' + config.core.temp_directory)
        .error('If you are unsure, you can safely ignore this message.');
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
