import { isAdministrator } from '@/lib/role';
import { FastifyReply, FastifyRequest } from 'fastify';

export async function administratorMiddleware(req: FastifyRequest, res: FastifyReply) {
  if (!req.user) return res.forbidden('not logged in');

  if (!isAdministrator(req.user.role)) return res.forbidden();
}
