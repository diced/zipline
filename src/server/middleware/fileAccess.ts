import { config } from '@/lib/config';
import { verifyPassword, hashPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { File } from '@/prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { getSession } from '../session';
import { parseUserToken } from './user';

export type FileAccessResult =
  | {
      allowed: true;
      userId?: string;
      share: { id: string; token: string } | null;
      needsFilePassword: boolean;
    }
  | { allowed: false };

async function getAuthenticatedUserId(req: FastifyRequest, res: FastifyReply): Promise<string | null> {
  const authorization = req.headers.authorization;

  if (authorization) {
    const token = parseUserToken(authorization, true);
    if (!token) return null;

    const user = await prisma.user.findFirst({
      where: { token },
      select: { id: true },
    });

    return user?.id ?? null;
  }

  const session = await getSession(req, res);
  if (session.tokenAuth || !session.id || !session.sessionId) return null;

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: { id: session.sessionId },
      },
    },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function verifyFileAccess(
  req: FastifyRequest,
  res: FastifyReply,
  file: Pick<File, 'id' | 'userId' | 'password'>,
): Promise<FileAccessResult> {
  const privateByDefault = config.features.filesPrivateByDefault;

  const requestingUserId = await getAuthenticatedUserId(req, res);
  if (requestingUserId && file.userId && requestingUserId === file.userId) {
    return { allowed: true, userId: requestingUserId, share: null, needsFilePassword: !!file.password };
  }

  const shareToken = (req.query as any)?.share;
  if (shareToken && typeof shareToken === 'string') {
    const share = await prisma.fileShare.findFirst({
      where: { token: shareToken, fileId: file.id },
    });

    if (!share) return { allowed: false };

    if (share.expiresAt && share.expiresAt <= new Date()) return { allowed: false };
    if (share.maxViews && share.views >= share.maxViews) return { allowed: false };

    if (share.password) {
      const password = (req.query as any)?.sharePassword;
      if (typeof password !== 'string' || !(await verifyPassword(password, share.password))) {
        return { allowed: false };
      }
    }

    await prisma.fileShare.update({
      where: { id: share.id },
      data: { views: { increment: 1 } },
    });

    return { allowed: true, share: { id: share.id, token: share.token }, needsFilePassword: !!file.password };
  }

  if (!privateByDefault) {
    return {
      allowed: true,
      userId: requestingUserId ?? undefined,
      share: null,
      needsFilePassword: !!file.password,
    };
  }

  return { allowed: false };
}

export async function canAccessFileAsOwner(
  req: FastifyRequest,
  res: FastifyReply,
  file: Pick<File, 'id' | 'userId'>,
): Promise<boolean> {
  const requestingUserId = await getAuthenticatedUserId(req, res);
  return !!requestingUserId && requestingUserId === file.userId;
}

export { hashPassword };
