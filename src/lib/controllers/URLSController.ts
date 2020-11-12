import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  FastifyInstanceToken,
  Inject,
  GET,
  DELETE,
  POST
} from 'fastify-decorators';
import { Repository } from 'typeorm';
import { URL } from '../entities/URL';
import { User } from '../entities/User';
import { Configuration, ConfigWebhooks } from '../Config';
import { Console } from '../logger';
import { createRandomId, readBaseCookie, sendError } from '../Util';
import { WebhookType, Webhooks } from '../Webhooks';

const config = Configuration.readConfig();

@Controller('/api/urls')
export class URLSController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private urls: Repository<URL> = this.instance.orm.getRepository(URL);
  private users: Repository<User> = this.instance.orm.getRepository(User);
  private logger: Console = Console.logger(URL);
  private webhooks: ConfigWebhooks = Webhooks.conf(config);

  @GET('/')
  async allURLS(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');

    const all = await this.urls.find({
      where: {
        user: readBaseCookie(req.cookies.zipline)
      }
    });

    return reply.send(all);
  }

  @DELETE('/:id')
  async deleteURL(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');

    const url = await this.urls.findOne({
      where: {
        user: readBaseCookie(req.cookies.zipline),
        id: req.params.id
      }
    });

    if (!url) return sendError(reply, 'No url');

    this.logger.verbose(`attempting to delete url ${url.id}`);
    this.urls.delete({
      id: req.params.id
    });

    this.logger.info(`url ${url.id} was deleted`);
    if (this.webhooks.events.includes(WebhookType.DELETE_URL))
      Webhooks.sendWebhook(this.webhooks.delete_url.content, {
        url,
        host: `${config.core.secure ? 'https' : 'http'}://${req.hostname}${
          config.urls.route
        }/`
      });

    return reply.send(url);
  }

  @POST('/')
  async createURL(
    req: FastifyRequest<{ Body: { vanity: string; url: string } }>,
    reply: FastifyReply
  ) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');

    if (config.urls.vanity && req.body.vanity) {
      const existingVanity = await this.urls.findOne({
        where: {
          vanity: req.body.vanity
        }
      });
      if (existingVanity)
        return sendError(reply, 'There is an existing vanity!');
    }

    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline)
      }
    });

    if (!user) return sendError(reply, 'No user');

    const id = createRandomId(config.urls.length);

    this.logger.verbose(`attempting to save url ${id}`);
    const url = await this.urls.save(
      new URL(id, user.id, req.body.url, req.body.vanity || null)
    );

    this.logger.info(`saved url ${url.id}`);
    if (this.webhooks.events.includes(WebhookType.SHORTEN))
      Webhooks.sendWebhook(this.webhooks.shorten.content, {
        url,
        host: `${config.core.secure ? 'https' : 'http'}://${req.hostname}${
          config.urls.route
        }/`
      });

    return reply.send(url);
  }
}
