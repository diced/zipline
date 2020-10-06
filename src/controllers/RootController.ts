import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import { Controller, GET, POST, FastifyInstanceToken, Inject, Hook } from 'fastify-decorators';
import { UserNotFoundError, MissingBodyData, LoginError, UserExistsError, NotAdministratorError } from '../lib/api/APIErrors';
import { User } from '../lib/Data';
import { checkPassword, createToken, encryptPassword } from '../lib/Encryption';

@Controller('/api')
export class RootController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  @POST('/upload')
  async loginStatus(req: FastifyRequest, reply: FastifyReply) {
    console.log(req);
  }
}