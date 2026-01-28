import { prisma } from '@/lib/db';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';

export type ApiAdminStatsResponse = {
  totalFiles: number;
  totalTextFiles: number;
  registeredAccounts: number;
  lastRegisteredAccount: {
    username: string;
    id: string;
  } | null;
  activeInvites: number;
};

export const PATH = '/api/admin/stats';

export default typedPlugin(
  async (server) => {
    server.get(PATH, { preHandler: [userMiddleware, administratorMiddleware] }, async (req, res) => {
      // Get total files count
      const totalFiles = await prisma.file.count();

      // Get total text files count
      const totalTextFiles = await prisma.file.count({
        where: {
          type: {
            startsWith: 'text/',
          },
        },
      });

      // Get registered accounts count
      const registeredAccounts = await prisma.user.count();

      // Get last registered account
      const lastRegisteredUser = await prisma.user.findFirst({
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          username: true,
          id: true,
        },
      });

      // Get active invites count
      const now = new Date();
      const allInvites = await prisma.invite.findMany({
        select: {
          expiresAt: true,
          maxUses: true,
          uses: true,
        },
      });

      const activeInvites = allInvites.filter(
        (invite: { expiresAt: Date | null; maxUses: number | null; uses: number }) => {
          const notExpired = !invite.expiresAt || invite.expiresAt > now;
          const notMaxedOut = !invite.maxUses || invite.uses < invite.maxUses;
          return notExpired && notMaxedOut;
        },
      ).length;

      return res.send({
        totalFiles,
        totalTextFiles,
        registeredAccounts,
        lastRegisteredAccount: lastRegisteredUser,
        activeInvites,
      });
    });
  },
  { name: PATH },
);
