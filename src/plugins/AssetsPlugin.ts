import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Config } from '../lib/Config';
import { Plugin } from '../lib/plugin';
import { URL } from '../lib/entities/URL';
import Server from 'next/dist/next-server/server/next-server';
import { Connection } from 'typeorm';
import { existsSync } from 'fs';
import { join } from 'path';

export default class implements Plugin {
  public name: string = "assets";

  public onLoad(server: FastifyInstance, orm: Connection, app: Server, config: Config) {
    server.get(`${config.urls.route}/:id`, async function (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) {
      const urls = orm.getRepository(URL);

      const urlId = await urls.findOne({
        where: {
          id: req.params.id
        }
      });

      const urlVanity = await urls.findOne({
        where: {
          vanity: req.params.id
        }
      });

      if (config.urls.vanity && urlVanity) return reply.redirect(urlVanity.url);
      if (!urlId) {
        await app.render404(req.raw, reply.raw);
        return (reply.sent = true);
      }
      return reply.redirect(urlId.url);
    });

    server.get(`${config.uploader.rich_content_route || '/a'}/:id`, async function (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) {
      if (!existsSync(join(config.uploader.directory, req.params.id))) {
        await app.render404(req.raw, reply.raw);
        return (reply.sent = true);
      }

      return reply.type('text/html').send(`
      <html>
      <head>
          <meta property="theme-color" content="${config.meta.color}">
          <meta property="og:title" content="${req.params.id}">
          <meta property="og:url" content="${config.uploader.route}/${req.params.id}">
          <meta property="og:image" content="${config.uploader.route}/${req.params.id}">
          <meta property="twitter:card" content="summary_large_image">
      </head>
      <body>
        <div style="text-align:center;vertical-align:middle;">
          <img src="${config.uploader.route}/${req.params.id}" >
        </div>
      </body>
      </html>
      `);
    });
  }
}