import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  POST,
  FastifyInstanceToken,
  Inject,
} from 'fastify-decorators';
import { Multipart } from 'fastify-multipart';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { createRandomId } from '../lib/Encryption';

@Controller('/api')
export class RootController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private users: Repository<User> = this.instance.orm.getRepository(User);

  @POST('/upload')
  async loginStatus(req: FastifyRequest, reply: FastifyReply) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore stupid multipart types smh
    const data: Multipart = req.file();
    const ext = data.filename.split('.')[1];
    const fileName = createRandomId(6);
    const path = `./uploads/${fileName}.${ext}`;
    if (!existsSync('./uploads')) mkdirSync('./uploads');
    data.file.pipe(createWriteStream(path));
    reply.send(`${req.protocol}://${req.hostname}/u/${fileName}.${ext}`);
  }
}
