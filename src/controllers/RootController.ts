import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  POST,
  FastifyInstanceToken,
  Inject,
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

    this.images.save(new Image(fileName, user.id));

    data.file.pipe(createWriteStream(path));
    reply.send(
      `${req.protocol}://${req.hostname}${config.uploader.route}/${fileName}.${ext}`
    );
  }
}
