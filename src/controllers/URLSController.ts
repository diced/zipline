import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  FastifyInstanceToken,
  Inject,
  GET,
  DELETE,
  POST,
} from 'fastify-decorators';
import { Repository } from 'typeorm';
import { URL } from '../entities/URL';
import { User } from '../entities/User';
import { LoginError } from '../lib/api/APIErrors';
import { Configuration } from '../lib/Config';
import { createRandomId, readBaseCookie } from '../lib/Util';

const config = Configuration.readConfig();
if (!config) process.exit(0);

@Controller('/api/urls')
export class URLSController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private urls: Repository<URL> = this.instance.orm.getRepository(URL);
  private users: Repository<User> = this.instance.orm.getRepository(User);

  @GET('/')
  async allURLS(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const all = await this.urls.find({
      where: {
        user: readBaseCookie(req.cookies.zipline),
      },
    });

    return reply.send(all);
  }

  @DELETE('/:id')
  async deleteURL(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const url = await this.urls.findOne({
      where: {
        user: readBaseCookie(req.cookies.zipline),
        id: req.params.id,
      },
    });

    if (!url) throw new Error('No url');

    this.urls.delete({
      id: req.params.id,
    });

    return reply.send(url);
  }

  @POST('/')
  async createURL(
    req: FastifyRequest<{ Body: { vanity: string; url: string } }>,
    reply: FastifyReply
  ) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    if (config.urls.vanity && req.body.vanity) {
      const existingVanity = await this.urls.findOne({
        where: {
          vanity: req.body.vanity,
        },
      });
      if (existingVanity) throw new Error('There is an existing vanity!');
    }

    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline),
      },
    });

    if (!user) throw new LoginError('No user');

    const url = await this.urls.save(
      new URL(
        createRandomId(config.urls.length),
        user.id,
        req.body.url,
        req.body.vanity || null
      )
    );
    return reply.send(url);
  }
}
