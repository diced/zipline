import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  POST,
  FastifyInstanceToken,
  Inject,
  GET,
} from 'fastify-decorators';
import { Multipart } from 'fastify-multipart';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { Image } from '../entities/Image';
import { User } from '../entities/User';
import { AuthError } from '../lib/api/APIErrors';
import { Configuration } from '../lib/Config';
import { createRandomId } from '../lib/Encryption';

const config = Configuration.readConfig();
if (!config) process.exit(0);

@Controller('/api')
export class RootController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private users: Repository<User> = this.instance.orm.getRepository(User);
  private images: Repository<Image> = this.instance.orm.getRepository(Image);

  @GET('/config/uploader')
  async uploaderConfig() {
    return Configuration.readConfig().uploader;
  }

  @GET('/users')
  async allUsers(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new Error('Not logged in.');
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
    if (!req.cookies.zipline) throw new Error('Not logged in.');

    const images = await this.images.find();
    const users = await this.users.find();

    const totalViews = images.map(x => x.views).reduce((a, b) => Number(a) + Number(b), 0);
    const leaderboardImages = [];
    const leaderboardViews = [];

    for (const user of users) {
      const usersImages = await this.images.find({
        where: { user: user.id },
      });
      leaderboardImages.push({
        username: user.username,
        images: usersImages.length
      });
      leaderboardViews.push({
        username: user.username,
        views: usersImages.map(x => x.views).reduce((a, b) => Number(a) + Number(b), 0)
      });
    }

    return reply.send({
      images: images.length,
      totalViews,
      leaderboardImages: leaderboardImages.sort((a, b) => b.images - a.images),
      leaderboardViews: leaderboardViews.sort((a, b) => b.views - a.views)
    });
  }

  @POST('/upload')
  async loginStatus(req: FastifyRequest, reply: FastifyReply) {
    if (!req.headers.authorization)
      return new AuthError('No authorization header!');

    const user = await this.users.findOne({
      where: {
        token: req.headers.authorization,
      },
    });
    if (!user) return new AuthError('Incorrect token!');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore stupid multipart types smh
    const data: Multipart = await req.file();

    if (!existsSync(config.uploader.directory))
      mkdirSync(config.uploader.directory);

    const ext = data.filename.split('.')[1];
    const fileName = createRandomId(config.uploader.length);
    const path = join(config.uploader.directory, `${fileName}.${ext}`);

    this.images.save(new Image(fileName, ext, user.id));

    data.file.pipe(createWriteStream(path));
    reply.send(
      `${req.protocol}://${req.hostname}${config.uploader.route}/${fileName}.${ext}`
    );
  }
}
