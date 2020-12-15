import { FastifyInstance } from 'fastify';
import { Config } from '../lib/Config';
import { Plugin } from '../lib/plugin';
import { Console } from '../lib/logger';
import Server from 'next/dist/next-server/server/next-server';
import { Connection } from 'typeorm';
import { bold, green, red } from '@dicedtomato/colors';

export default class implements Plugin {
  public name: string = "fastify_hooks";

  public onLoad(server: FastifyInstance, orm: Connection, app: Server, config: Config) {
    server.addHook('preHandler', async (req, reply) => {
      if (
        config.core.blacklisted_ips &&
        config.core.blacklisted_ips.includes(req.ip)
      ) {
        await app.render404(req.raw, reply.raw);
        return (reply.sent = true);
      }
    });

    server.addHook('onResponse', (req, res, done) => {
      if (!req.url.startsWith('/_next') && config.core.log) {
        const status =
          res.statusCode !== 200
            ? bold(red(res.statusCode.toString()))
            : bold(green(res.statusCode.toString()));
        Console.logger('server').info(`${status} ${req.url} was accessed`);
      }
      done();
    });
  }
}