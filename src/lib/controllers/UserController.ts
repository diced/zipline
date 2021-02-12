import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  GET,
  POST,
  PATCH,
  FastifyInstanceToken,
  Inject,
  DELETE
} from 'fastify-decorators';
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { Image } from '../entities/Image';
import { Zipline } from '../entities/Zipline';
import { Configuration, ConfigWebhooks } from '../Config';
import { Console } from '../logger';
import {
  checkPassword,
  createBaseCookie,
  createToken,
  encryptPassword,
  getFirst,
  readBaseCookie,
  sendError
} from '../Util';
import { WebhookType, Webhooks } from '../Webhooks';

const config = Configuration.readConfig();

@Controller('/api/user')
export class UserController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private users: Repository<User> = this.instance.orm.getRepository(User);
  private images: Repository<Image> = this.instance.orm.getRepository(Image);
  private logger: Console = Console.logger(User);
  private webhooks: ConfigWebhooks = Webhooks.conf(config);

  @GET('/login-status')
  async loginStatus(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({
      user: !!req.cookies.zipline
    });
  }

  @GET('/')
  async currentUser(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');
    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline)
      }
    });
    // eslint-disable-next-line quotes
    if (!user) return sendError(reply, "User doesn't exist");
    delete user.password;
    return reply.send(user);
  }

  @GET('/stats')
  async stats(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');
    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline)
      }
    });

    const images = await this.images.find({
      where: {
        user: user.id
      }
    });

    const totalViews = images.map(x => x.views).reduce((a, b) => Number(a) + Number(b), 0);

    return reply.send({
      totalViews,
      images: images.length,
      averageViews: totalViews / images.length
    });
  }

  @PATCH('/')
  async editUser(
    req: FastifyRequest<{
      Body: { username: string; password: string; email: string };
    }>,
    reply: FastifyReply
  ) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');

    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline)
      }
    });
    // eslint-disable-next-line quotes
    if (!user) return sendError(reply, "User doesn't exist");

    this.logger.verbose(`attempting to save ${user.username} (${user.id})`);
    user.username = req.body.username;
    if (req.body.password) user.password = encryptPassword(req.body.password);
    if (req.body.email) user.email = req.body.email;
    await this.users.save(user);

    this.logger.info(`saved ${user.username} (${user.id})`);
    if (this.webhooks.events.includes(WebhookType.USER_EDIT)) Webhooks.sendWebhook(this.webhooks.user_edit.content, {
      user
    });

    delete user.password;
    return reply.send(user);
  }

  @POST('/verify-login')
  async verify(
    req: FastifyRequest<{ Body: { username: string; password: string } }>,
    reply: FastifyReply
  ) {
    if (req.cookies.zipline) return sendError(reply, 'Already logged in.');
    if (!req.body.username) return sendError(reply, 'Missing username.');
    if (!req.body.password) return sendError(reply, 'Missing uassword.');

    const user = await this.users.findOne({
      where: {
        username: req.body.username
      }
    });

    if (!user) return sendError(reply, `User "${req.body.username}" was not found.`);
    if (!checkPassword(req.body.password, user.password)) {
      this.logger.error(
        `${user.username} (${user.id}) tried to verify their credentials but failed`
      );
      return sendError(reply, 'Wrong credentials!');
    }

    reply.send({
      mfa: !!user.secretMfaKey
    });
  }

  @POST('/login')
  async login(
    req: FastifyRequest<{ Body: { username: string; password: string } }>,
    reply: FastifyReply
  ) {
    if (req.cookies.zipline) return sendError(reply, 'Already logged in.');
    if (!req.body.username) return sendError(reply, 'Missing username.');
    if (!req.body.password) return sendError(reply, 'Missing uassword.');

    const user = await this.users.findOne({
      where: {
        username: req.body.username
      }
    });

    if (!user) return sendError(reply, `User "${req.body.username}" was not found.`);
    if (!checkPassword(req.body.password, user.password)) {
      this.logger.error(
        `${user.username} (${user.id}) tried to login but failed`
      );
      return sendError(reply, 'Wrong credentials!');
    }
    delete user.password;

    this.logger.verbose(`set cookie for ${user.username} (${user.id})`);
    reply.setCookie('zipline', createBaseCookie(user.id), {
      path: '/',
      maxAge: 1036800000,
      signed: true
    });

    this.logger.info(`${user.username} (${user.id}) logged in`);
    if (this.webhooks.events.includes(WebhookType.LOGIN)) Webhooks.sendWebhook(this.webhooks.login.content, {
      user
    });

    return reply.send(user);
  }

  @POST('/logout')
  async logout(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');
    try {
      reply.clearCookie('zipline', { path: '/' });
      return reply.send({ clearStore: true });
    } catch (e) {
      reply.send({ clearStore: false });
    }
  }

  @POST('/reset-token')
  async resetToken(req: FastifyRequest, reply: FastifyReply) {

    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline)
      }
    });

    if (!user) return sendError(reply, 'User was not found.');

    this.logger.verbose(
      `attempting to reset token ${user.username} (${user.id})`
    );
    user.token = createToken();
    await this.users.save(user);

    this.logger.info(`reset token ${user.username} (${user.id})`);
    if (this.webhooks.events.includes(WebhookType.TOKEN_RESET)) Webhooks.sendWebhook(this.webhooks.token_reset.content, {
      user
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
    const firstSetup = await getFirst(this.instance.orm);

    if (!firstSetup && !req.cookies.zipline) return sendError(reply, 'Not logged in.');

    if (!req.body.username) return sendError(reply, 'Missing username.');
    if (!req.body.password) return sendError(reply, 'Missing uassword.');

    const existing = await this.users.findOne({
      where: { username: req.body.username }
    });
    if (existing) return sendError(reply, 'User exists already');

    if (req.body.username.length > 25) return sendError(reply, 'Limit 25');

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
      if (this.webhooks.events.includes(WebhookType.CREATE_USER)) Webhooks.sendWebhook(this.webhooks.create_user.content, {
        user
      });

      if (firstSetup) await this.instance.orm.getRepository(Zipline).update(
        {
          id: 'zipline'
        },
        {
          first: false
        }
      );

      delete user.password;
      return reply.send(user);
    } catch (e) {
      return sendError(reply, `Could not create user: ${e.message}`);
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
      where: { id: req.params.id }
    });
    if (!existing) return sendError(reply, 'User doesnt exist');

    try {
      this.logger.verbose(
        `attempting to delete ${existing.username} (${existing.id})`
      );
      await this.users.remove(existing);

      this.logger.info(`deleted ${existing.username} (${existing.id})`);
      if (this.webhooks.events.includes(WebhookType.USER_DELETE)) Webhooks.sendWebhook(this.webhooks.user_delete.content, {
        user: existing
      });

      return reply.send({ ok: true });
    } catch (e) {
      return sendError(reply, `Could not delete user: ${e.message}`);
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
