import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import {
  Controller,
  GET,
  FastifyInstanceToken,
  Inject,
  POST
} from 'fastify-decorators';
import { Repository } from 'typeorm';
import { User } from '../../entities/User';
import { totp, generateSecret, otpauthURL } from 'speakeasy';
import { toDataURL } from 'qrcode';
import { checkPassword, createBaseCookie, readBaseCookie } from '../../Util';
import { LoginError, MissingBodyData, UserNotFoundError } from '../APIErrors';
import { Console } from '../../logger';
import { WebhookType, WebhookHelper } from '../../Webhooks';
import { Configuration, ConfigWebhooks } from '../../Config';

const config = Configuration.readConfig();

@Controller('/api/mfa')
export class MultiFactorController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  private users: Repository<User> = this.instance.orm.getRepository(User);
  private logger: Console = Console.logger(User);
  private webhooks: ConfigWebhooks = WebhookHelper.conf(config);

  @GET('/qrcode')
  async qrcode(req: FastifyRequest, reply: FastifyReply) {
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');
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
    if (!req.cookies.zipline) throw new LoginError('Not logged in.');
    const user = await this.users.findOne({
      where: {
        id: readBaseCookie(req.cookies.zipline)
      }
    });

    user.secretMfaKey = null;

    this.users.save(user);

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
    if (req.cookies.zipline) throw new LoginError('Already logged in.');
    if (!req.body.username) throw new MissingBodyData('Missing username.');
    if (!req.body.password) throw new MissingBodyData('Missing uassword.');

    const user = await this.users.findOne({
      where: {
        username: req.body.username
      }
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

    this.logger.info(`${user.username} (${user.id}) logged in`);
    if (this.webhooks.events.includes(WebhookType.LOGIN))
      WebhookHelper.sendWebhook(this.webhooks.login.content, {
        user
      });

    return reply.send({ user, passed });
  }
}
