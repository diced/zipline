import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  POST,
  FastifyInstanceToken,
  Inject,
  GET
} from 'fastify-decorators';
import { Multipart } from 'fastify-multipart';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { Image } from '../entities/Image';
import { User } from '../entities/User';
import { Configuration, ConfigWebhooks } from '../Config';
import { createRandomId, getFirst, sendError } from '../Util';
import { Console } from '../logger';
import { Webhooks, WebhookType } from '../Webhooks';
const pump = promisify(pipeline);

const config = Configuration.readConfig();
if (!config.core || !config.database) {
  Console.logger('Zipline').error(
    'configuration seems to be invalid, did you generate a config? https://zipline.diced.wtf/docs/auto'
  );
  process.exit(0);
}
const rateLimiterConfig = config.core.ratelimiter
  ? {
    config: {
      rateLimit: {
        max: config.core.ratelimiter.requests,
        timeWindow: config.core.ratelimiter.retry_after
      }
    }
  }
  : {};

@Controller('/api')
export class RootController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private users: Repository<User> = this.instance.orm.getRepository(User);
  private images: Repository<Image> = this.instance.orm.getRepository(Image);
  private webhooks: ConfigWebhooks = Webhooks.conf(config);
  private logger: Console = Console.logger(Image);

  @GET('/first')
  async getFirstSetup() {
    const first = await getFirst(this.instance.orm);
    return first;
  }

  @GET('/users')
  async allUsers(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');
    const users = await this.users.find();
    const final = [];

    for (const user of users) {
      delete user.password;
      delete user.token;
      final.push(user);
    }

    return reply.send(final);
  }

  @GET('/statistics')
  async stats(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');

    const images = await this.images.find();
    const users = await this.users.find();

    const totalViews = images
      .map(x => x.views)
      .reduce((a, b) => Number(a) + Number(b), 0);
    const lb = [];

    for (const user of users) {
      const usersImages = await this.images.find({
        where: { user: user.id }
      });

      lb.push({
        username: user.username,
        images: usersImages.length,
        views: usersImages
          .map(x => x.views)
          .reduce((a, b) => Number(a) + Number(b), 0)
      });
    }

    return reply.send({
      images: images.length,
      totalViews,
      leaderboard: lb.sort((a, b) => b.images - a.images)
    });
  }

  @POST('/upload', rateLimiterConfig)
  async loginStatus(req: FastifyRequest, reply: FastifyReply) {
    if (!req.headers.authorization) return sendError(reply, 'No authorization header!');

    const user = await this.users.findOne({
      where: {
        token: req.headers.authorization
      }
    });
    if (!user) return sendError(reply, 'Incorrect token!');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore stupid multipart types smh
    const data: Multipart = await req.file();

    if (!existsSync(config.uploader.directory)) mkdirSync(config.uploader.directory);
    
    const og = data.filename;
    const ext = data.filename.split('.').pop();
    if (config.uploader.blacklisted.includes(ext)) return sendError(reply, 'Blacklisted file extension!');
    console.log(data.filename);
    const fileName = config.uploader.original
      ? og
      : createRandomId(config.uploader.length);
    const path = join(config.uploader.directory, config.uploader.original ? fileName : `${fileName}.${ext}`);

    this.logger.verbose(`attempting to save ${fileName} to db`);
    const image = await this.images.save(new Image(config.uploader.original, fileName, ext, user.id));
    this.logger.verbose(`saved image ${image.id} to db`);

    this.logger.verbose(`attempting to save file ${path}`);
    await pump(data.file, createWriteStream(path));
    this.logger.verbose(`saved ${path}`);

    this.logger.info(
      `image ${fileName}.${ext} was uploaded by ${user.username} (${user.id})`
    );

    const host = `${config.core.secure ? 'https' : 'http'}://${req.hostname}${
      config.uploader.rich_content_route
        ? config.uploader.rich_content_route
        : config.uploader.route
    }/${config.uploader.original ? og : `${fileName}.${ext}`}`;

    if (this.webhooks.events.includes(WebhookType.UPLOAD)) Webhooks.sendWebhook(this.webhooks.upload.content, {
      image,
      user,
      host
    });

    reply.send(host);
  }
}
