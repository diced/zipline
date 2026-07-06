import { FastifyReply } from 'fastify';

export function setContentSecurity(res: FastifyReply) {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('Content-Security-Policy', 'sandbox');
}
