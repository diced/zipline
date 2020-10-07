import { FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import { Controller, GET, POST, FastifyInstanceToken, Inject, Hook } from 'fastify-decorators';
import { User } from '../entities/User';

@Controller('/api')
export class RootController {
  @Inject(FastifyInstanceToken)
  private instance!: FastifyInstance;

  @POST('/upload')
  async loginStatus(req: FastifyRequest, reply: FastifyReply) {
    
  }
}