import { FastifyInstance } from 'fastify';
import Server from 'next/dist/next-server/server/next-server';
import { Connection } from 'typeorm';
import { Config } from '../../Config';
import { Plugin } from '../Plugin';
import fastifyTypeorm from 'fastify-typeorm-plugin';
import fastifyCookies from 'fastify-cookie';
import fastifyMultipart from 'fastify-multipart';
import fastifyRateLimit from 'fastify-rate-limit';
import fastifyStatic from 'fastify-static';
import fastifyFavicon from 'fastify-favicon';
import { bootstrap } from 'fastify-decorators';
import { User } from '../../entities/User';
import { Zipline } from '../../entities/Zipline';
import { Image } from '../../entities/Image';
import { URL } from '../../entities/URL';
import { UserController } from '../../controllers/UserController';
import path, { join } from 'path';
import { ImagesController } from '../../controllers/ImagesController';
import { MultiFactorController } from '../../controllers/MultiFactorController';
import { RootController } from '../../controllers/RootController';
import { URLSController } from '../../controllers/URLSController';

export default class implements Plugin {
  public name: string = "assets";

  public onLoad(server: FastifyInstance, orm: Connection, app: Server, config: Config) {
    server.register(fastifyMultipart);

    server.register(fastifyTypeorm, {
      ...config.database,
      entities: [Image, URL, User, Zipline],
      synchronize: true,
      logging: false
    });

    server.register(bootstrap, {
      controllers: [
        UserController,
        RootController,
        ImagesController,
        URLSController,
        MultiFactorController
      ]
    });

    server.register(fastifyCookies, {
      secret: config.core.secret
    });
    
    server.register(fastifyStatic, {
      root: join(process.cwd(), 'public'),
      prefix: '/public',
      decorateReply: false
    });

    server.register(fastifyFavicon);
  }
}