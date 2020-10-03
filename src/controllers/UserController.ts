import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import { Controller, GET, POST, FastifyInstanceToken, Inject } from 'fastify-decorators';
import { UserNotFoundError, MissingBodyData, LoginError } from '../lib/APIErrors';
import { encrypt } from '../lib/Encryption';

@Controller('/api/user')
export class UserController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  @GET('/login-status')
  async loginStatus(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ user: !!req.cookies.zipline });
  }

  @POST('/login')
  async login(req: FastifyRequest<{ Body: { username: string, password: string } }>, reply: FastifyReply) {
    if (req.cookies.zipline) throw new LoginError(`Already logged in.`)
    if (!req.body.username) throw new MissingBodyData(`Missing username.`);
    if (!req.body.password) throw new MissingBodyData(`Missing uassword.`);

    const user = await this.instance.mongo.db.collection('zipline_users').findOne({
      username: req.body.username
    });

    if (!user) throw new UserNotFoundError(`User "${req.body.username}" was not found.`);
    return reply
      .setCookie("zipline", encrypt(user.id))
      .send({
        loggedIn: true
      });
  }
}