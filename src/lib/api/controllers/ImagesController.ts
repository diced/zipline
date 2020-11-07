import { unlinkSync } from 'fs';
import { join } from 'path';
import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  FastifyInstanceToken,
  Inject,
  GET,
  DELETE
} from 'fastify-decorators';
import { Repository } from 'typeorm';
import { Image } from '../../entities/Image';
import { LoginError } from '../APIErrors';
import { Configuration, ConfigWebhooks } from '../../Config';
import { Console } from '../../logger';
import { readBaseCookie } from '../../Util';
import { WebhookHelper, WebhookType } from '../../Webhooks';

const config = Configuration.readConfig();

@Controller('/api/images')
export class ImagesController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private images: Repository<Image> = this.instance.orm.getRepository(Image);
  private webhooks: ConfigWebhooks = WebhookHelper.conf(config);

  @GET('/')
  async allImages(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const images = await this.images.find({
      where: {
        user: readBaseCookie(req.cookies.zipline)
      }
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
        id: req.params.id
      }
    });

    if (!image) throw new Error('No image');

    this.images.delete({
      id: req.params.id
    });

    const dir = config.uploader.directory ? config.uploader.directory : 'uploads';
    const path = join(dir.charAt(0) == '/' ? dir : join(process.cwd(), dir), image.file);

    try {
      unlinkSync(path);

      Console.logger(Image).info(`image ${image.id} was deleted`);
      if (this.webhooks.events.includes(WebhookType.DELETE_IMAGE))
        WebhookHelper.sendWebhook(this.webhooks.upload.content, {
          image,
          host: `${config.core.secure ? 'https' : 'http'}://${req.hostname}${config.uploader.route}/`
        });

      return reply.send(image);
    } catch (e) {
      Console.logger(Image).error(`image ${image.id} could not be deleted...`);
      return reply.status(401).send({ error: 'Could not delete image.' });
    }
  }

  @GET('/recent')
  async recentImages(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const images = await this.images.find({
      where: {
        user: readBaseCookie(req.cookies.zipline)
      }
    });

    return reply.send(images.slice(1).slice(-3).reverse());
  }

  @GET('/chunk')
  async pages(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const images = await this.images.find({
      where: {
        user: readBaseCookie(req.cookies.zipline)
      }
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
