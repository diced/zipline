import { IntervalJob } from '..';

export default function clearInvites(prisma: typeof globalThis.__db__) {
  return async function (this: IntervalJob) {
    const expiredInvites = await prisma.invite.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
      select: {
        code: true,
        id: true,
        uses: true,
      },
    });

    this.logger.debug(`found ${expiredInvites.length} expired invites`, {
      files: expiredInvites.map((i) => i.code),
    });

    const maxUsedInvites = await prisma.invite.findMany({
      where: {
        uses: {
          gte: prisma.invite.fields.maxUses,
        },
      },
    });

    this.logger.debug(`found ${maxUsedInvites.length} max used invites`, {
      files: maxUsedInvites.map((i) => i.code),
    });

    const toDelete = [...expiredInvites, ...maxUsedInvites];

    const { count } = await prisma.invite.deleteMany({
      where: {
        id: {
          in: toDelete.map((i) => i.id),
        },
      },
    });

    if (count)
      this.logger.info(`deleted ${count} expired/max used invites`, {
        codes: toDelete.map((i) => i.code),
      });
  };
}
