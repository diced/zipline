import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  FastifyInstanceToken,
  Inject,
  GET,
} from 'fastify-decorators';
import { Repository } from 'typeorm';
import { Image } from '../entities/Image';
import { LoginError } from '../lib/api/APIErrors';
import { Configuration } from '../lib/Config';
import { readBaseCookie } from '../lib/Encryption';

const config = Configuration.readConfig();
if (!config) process.exit(0);

@Controller('/api/images')
export class ImagesController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private images: Repository<Image> = this.instance.orm.getRepository(Image);

  @GET('/recent')
  async loginStatus(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const images = await this.images.find({
      where: {
        user: readBaseCookie(req.cookies.zipline),
      },
    });

    return reply.send(images.slice(1).slice(-3).reverse());
  }
}
