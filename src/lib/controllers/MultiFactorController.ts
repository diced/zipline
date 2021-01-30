import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  GET,
  FastifyInstanceToken,
  Inject,
  POST
} from 'fastify-decorators';
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { totp, generateSecret, otpauthURL } from 'speakeasy';
import { toDataURL } from 'qrcode';
import {
  checkPassword,
  createBaseCookie,
  readBaseCookie,
  sendError
} from '../Util';
import { Console } from '../logger';
import { WebhookType, Webhooks } from '../Webhooks';
import { Configuration, ConfigWebhooks } from '../Config';

const config = Configuration.readConfig();

@Controller('/api/mfa')
export class MultiFactorController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private users: Repository<User> = this.instance.orm.getRepository(User);
  private logger: Console = Console.logger(User);
  private webhooks: ConfigWebhooks = Webhooks.conf(config);

  @GET('/qrcode')
  async qrcode(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');
    let user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline)
      }
    });

    if (!user.secretMfaKey) {
      const secret = generateSecret({
        issuer: 'Zipline',
        length: 128,
        name: user.username
      });
      user.secretMfaKey = secret.base32;
      user = await this.users.save(user);
    }

    const dataURL = await toDataURL(
      otpauthURL({
        secret: user.secretMfaKey,
        label: user.email || 'none',
        issuer: 'Zipline',
        encoding: 'base32'
      })
    );

    return reply.send({
      dataURL
    });
  }

  @GET('/disable')
  async disable(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');
    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline)
      }
    });

    user.secretMfaKey = null;

    this.users.save(user);

    this.logger.info(`disabled mfa ${user.username} (${user.id})`);
    reply.send({ disabled: true });
  }

  @POST('/verify')
  async verify(
    req: FastifyRequest<{
      Querystring: { token: string };
      Body: { username: string; password: string };
    }>,
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
        `${user.username} (${user.id}) tried to login but failed with mfa`
      );
      return sendError(reply, 'Wrong credentials!');
    }
    delete user.password;

    const passed = totp.verify({
      encoding: 'base32',
      token: req.query.token,
      secret: user.secretMfaKey
    });

    this.logger.verbose(`set cookie for ${user.username} (${user.id})`);
    reply.setCookie('zipline', createBaseCookie(user.id), {
      path: '/',
      maxAge: 1036800000
    });

    this.logger.info(`${user.username} (${user.id}) logged in with mfa`);
    if (this.webhooks.events.includes(WebhookType.LOGIN)) Webhooks.sendWebhook(this.webhooks.login.content, {
      user
    });

    return reply.send({ user, passed });
  }

  @GET('/verify')
  async verifyOn(
    req: FastifyRequest<{
      Querystring: { token: string };
    }>,
    reply: FastifyReply
  ) {
    if (!req.cookies.zipline) return sendError(reply, 'Not logged in.');

    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline)
      }
    });

    if (!user) return sendError(reply, 'User that was signed in was not found, and guess what you should probably clear your cookies.');

    const passed = totp.verify({
      encoding: 'base32',
      token: req.query.token,
      secret: user.secretMfaKey
    });

    return reply.send(passed);
  }
}
