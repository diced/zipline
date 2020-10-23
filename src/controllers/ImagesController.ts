import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  FastifyInstanceToken,
  Inject,
  GET,
  DELETE,
} from 'fastify-decorators';
import { Repository } from 'typeorm';
import { Image } from '../entities/Image';
import { LoginError } from '../lib/api/APIErrors';
import { Configuration } from '../lib/Config';
import { readBaseCookie } from '../lib/Util';

const config = Configuration.readConfig();
if (!config) process.exit(0);

@Controller('/api/images')
export class ImagesController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private images: Repository<Image> = this.instance.orm.getRepository(Image);

  @GET('/')
  async allImages(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const images = await this.images.find({
      where: {
        user: readBaseCookie(req.cookies.zipline),
      },
    });

    return reply.send(images);
  }

  @DELETE('/:id')
  async deleteImage(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const image = await this.images.findOne({
      where: {
        user: readBaseCookie(req.cookies.zipline),
        id: req.params.id,
      },
    });

    if (!image) throw new Error('No image');

    this.images.delete({
      id: req.params.id,
    });

    return reply.send(image);
  }

  @GET('/recent')
  async recentImages(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const images = await this.images.find({
      where: {
        user: readBaseCookie(req.cookies.zipline),
      },
    });

    return reply.send(images.slice(1).slice(-3).reverse());
  }

  @GET('/chunk')
  async pages(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const images = await this.images.find({
      where: {
        user: readBaseCookie(req.cookies.zipline),
      },
    });

    function chunk(array: Image[], size: number) {
      if (!array) return [];
      const f = array.slice(0, size);
      if (!f.length) return array;
      return [f].concat(chunk(array.slice(size, array.length), size));
    }
    const chunks = chunk(images, 20);
    return reply.send(chunks);
  }
}
