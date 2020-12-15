import next from 'next';
import fastify from 'fastify';
import fastifyStatic from 'fastify-static';
import fastifyTypeorm from 'fastify-typeorm-plugin';
import { Console } from './lib/logger';
import { AddressInfo } from 'net';
import { bold, green, reset } from '@dicedtomato/colors';
import { Configuration } from './lib/Config';
import { join } from 'path';
import { checkVersion } from './lib/Util';
import { PluginLoader } from './lib/plugin';

const dev = process.env.NODE_ENV !== 'production';
const server = fastify({});
const app = next({
  dev,
  quiet: dev
});

app.prepare();

const pluginLoader = new PluginLoader(server, process.cwd(), dev ? './src/plugins' : './dist/plugins');
Console.logger(Configuration).verbose('searching for config...');
const config = Configuration.readConfig();

if (!config) {
  Console.logger(Configuration).error(
    `could not find a Zipline.toml file in ${process.cwd()}`
  );
  process.exit(0);
}

(async () => {
  const builtInPlugins = await pluginLoader.loadPlugins(true);
  for (const plugin of builtInPlugins) {
    try {
      plugin.onLoad(server, null, app, config);
    } catch (e) {
      Console.logger(PluginLoader).error(`failed to load built-in plugin: ${plugin.name}, ${e.message}`);
      process.exit(0);
    }
  }

  const dir = config.uploader.directory ? config.uploader.directory : 'uploads';
  const path = dir.charAt(0) == '/' ? dir : join(process.cwd(), dir);
  const handle = app.getRequestHandler();

  if (dev) server.get('/_next/*', async (req, reply) => {
    await handle(req.raw, reply.raw);
    return (reply.sent = true);
  });

  server.all('/*', async (req, reply) => {
    await handle(req.raw, reply.raw);
    return (reply.sent = true);
  });

  server.setNotFoundHandler(async (req, reply) => {
    await app.render404(req.raw, reply.raw);
    return (reply.sent = true);
  });

  server.register(fastifyStatic, {
    root: path,
    prefix: config.uploader.route
  });


  // done after everything so plugins can overwrite routes, etc.
  server.register(async () => {
    const plugins = await pluginLoader.loadPlugins();
    for (const plugin of plugins) {
      try {
        plugin.onLoad(server, server.orm, app, config);
        Console.logger(PluginLoader).info(`loaded plugin: ${plugin.name}`);
      } catch (e) {
        Console.logger(PluginLoader).error(`failed to load plugin: ${plugin.name}, ${e.message}`)
      }
    }
  })

  server.listen(
    {
      port: config.core.port,
      host: config.core.host
    },
    async err => {
      if (err) throw err;
      const info = server.server.address() as AddressInfo;

      Console.logger('Server').info(
        `server listening on ${bold(
          `${green(info.address)}${reset(':')}${bold(
            green(info.port.toString())
          )}`
        )}`
      );
    }
  );
})();