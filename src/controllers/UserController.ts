import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  GET,
  POST,
  PATCH,
  FastifyInstanceToken,
  Inject,
  DELETE,
} from 'fastify-decorators';
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import {
  UserNotFoundError,
  MissingBodyData,
  LoginError,
  UserExistsError,
} from '../lib/api/APIErrors';
import { Configuration } from '../lib/Config';
import { Console } from '../lib/logger';
import {
  checkPassword,
  createBaseCookie,
  createToken,
  encryptPassword,
  readBaseCookie,
} from '../lib/Util';
import { WebhookType, WebhookHelper } from '../lib/Webhooks';

const config = Configuration.readConfig();

@Controller('/api/user')
export class UserController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private users: Repository<User> = this.instance.orm.getRepository(User);
  private logger: Console = Console.logger(User);

  @GET('/login-status')
  async loginStatus(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({
      user: !!req.cookies.zipline,
    });
  }

  @GET('/')
  async currentUser(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');
    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline),
      },
    });
    if (!user) throw new UserExistsError('User doesn\'t exist');
    delete user.password;
    return reply.send(user);
  }

  @PATCH('/')
  async editUser(
    req: FastifyRequest<{ Body: { username: string; password: string } }>,
    reply: FastifyReply
  ) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline),
      },
    });
    if (!user) throw new UserExistsError('User doesn\'t exist');

    this.logger.verbose(`attempting to save ${user.username} (${user.id})`);
    user.username = req.body.username;
    user.password = encryptPassword(req.body.password);
    await this.users.save(user);

    this.logger.info(`saved ${user.username} (${user.id})`);
    if (config.webhooks.events.includes(WebhookType.USER_EDIT))
      WebhookHelper.sendWebhook(config.webhooks.user_edit.content, {
        user,
      });

    delete user.password;
    return reply.send(user);
  }

  @POST('/login')
  async login(
    req: FastifyRequest<{ Body: { username: string; password: string } }>,
    reply: FastifyReply
  ) {
    if (req.cookies.zipline) throw new LoginError('Already logged in.');
    if (!req.body.username) throw new MissingBodyData('Missing username.');
    if (!req.body.password) throw new MissingBodyData('Missing uassword.');

    const user = await this.users.findOne({
      where: {
        username: req.body.username,
      },
    });

    if (!user)
      throw new UserNotFoundError(`User "${req.body.username}" was not found.`);
    if (!checkPassword(req.body.password, user.password)) {
      this.logger.error(
        `${user.username} (${user.id}) tried to login but failed`
      );
      throw new LoginError('Wrong credentials!');
    }
    delete user.password;

    this.logger.verbose(`set cookie for ${user.username} (${user.id})`);
    reply.setCookie('zipline', createBaseCookie(user.id), {
      path: '/',
      maxAge: 1036800000,
    });

    this.logger.info(`${user.username} (${user.id}) logged in`);
    if (config.webhooks.events.includes(WebhookType.LOGIN))
      WebhookHelper.sendWebhook(config.webhooks.login.content, {
        user,
      });

    return reply.send(user);
  }

  @POST('/logout')
  async logout(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');
    try {
      reply.clearCookie('zipline', { path: '/' });
      return reply.send({ clearStore: true });
    } catch (e) {
      reply.send({ clearStore: false });
    }
  }

  @POST('/reset-token')
  async resetToken(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');

    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline),
      },
    });

    if (!user) throw new UserNotFoundError('User was not found.');

    this.logger.verbose(
      `attempting to reset token ${user.username} (${user.id})`
    );
    user.token = createToken();
    await this.users.save(user);

    this.logger.info(`reset token ${user.username} (${user.id})`);
    if (config.webhooks.events.includes(WebhookType.TOKEN_RESET))
      WebhookHelper.sendWebhook(config.webhooks.token_reset.content, {
        user,
      });

    return reply.send({ updated: true });
  }

  @POST('/create')
  async create(
    req: FastifyRequest<{
      Body: { username: string; password: string; administrator: boolean };
    }>,
    reply: FastifyReply
  ) {
    if (!req.body.username) throw new MissingBodyData('Missing username.');
    if (!req.body.password) throw new MissingBodyData('Missing uassword.');

    const existing = await this.users.findOne({
      where: { username: req.body.username },
    });
    if (existing) throw new UserExistsError('User exists already');

    try {
      this.logger.verbose(`attempting to create ${req.body.username}`);
      const user = await this.users.save(
        new User(
          req.body.username,
          encryptPassword(req.body.password),
          createToken(),
          req.body.administrator || false
        )
      );
      this.logger.info(`created user ${user.username} (${user.id})`);
      if (config.webhooks.events.includes(WebhookType.CREATE_USER))
        WebhookHelper.sendWebhook(config.webhooks.create_user.content, {
          user,
        });

      delete user.password;
      return reply.send(user);
    } catch (e) {
      throw new Error(`Could not create user: ${e.message}`);
    }
  }

  @DELETE('/:id')
  async delete(
    req: FastifyRequest<{
      Params: {
        id: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const existing = await this.users.findOne({
      where: { id: req.params.id },
    });
    if (!existing) throw new UserExistsError('User doesnt exist');

    try {
      this.logger.verbose(
        `attempting to delete ${existing.username} (${existing.id})`
      );
      await this.users.delete({
        id: existing.id,
      });

      this.logger.info(`deleted ${existing.username} (${existing.id})`);
      if (config.webhooks.events.includes(WebhookType.USER_DELETE))
        WebhookHelper.sendWebhook(config.webhooks.user_delete.content, {
          user: existing,
        });

      return reply.send({ ok: true });
    } catch (e) {
      throw new Error(`Could not delete user: ${e.message}`);
    }
  }

  // @Hook('preValidation')
  // public async preValidation(req: FastifyRequest, reply: FastifyReply) {
  //   // const adminRoutes = ['/api/user/create'];
  //   // if (adminRoutes.includes(req.routerPath)) {
  //   //   if (!req.cookies.zipline) return reply.send({ error: "You are not logged in" });
  //   //   const admin = await this.instance.mongo.db.collection('zipline_users').findOne({ _id: req.cookies.zipline });
  //   //   if (!admin) return reply.send({ error: "You are not an administrator" });
  //   //   return;
  //   // }
  //   // return;
  // }
}
