import { ApiError } from '@/lib/api/errors';
import { isAdministrator } from '@/lib/role';
import { FastifyReply, FastifyRequest } from 'fastify';

export async function administratorMiddleware(req: FastifyRequest, res: FastifyReply) {
  if (!req.user) throw new ApiError(2000);

  if (!isAdministrator(req.user.role)) throw new ApiError(3000);
}
