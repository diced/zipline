import { db } from '@/lib/db';
import { invites } from '@/lib/db/schema';
import { and, gte, inArray, isNotNull, lte, or } from 'drizzle-orm';
import { IntervalTask } from '..';

export default function clearInvites() {
  return async function (this: IntervalTask) {
    const now = new Date();
    const staleInvites = await db.query.invites.findMany({
      columns: { code: true, id: true },
      where: or(
        lte(invites.expiresAt, now),
        and(isNotNull(invites.maxUses), gte(invites.uses, invites.maxUses)),
      ),
    });

    this.logger.debug(`found ${staleInvites.length} expired/max used invites`, {
      codes: staleInvites.map((invite) => invite.code),
    });

    const deleted = staleInvites.length
      ? await db
          .delete(invites)
          .where(
            inArray(
              invites.id,
              staleInvites.map((invite) => invite.id),
            ),
          )
          .returning({ id: invites.id })
      : [];

    if (deleted.length)
      this.logger.info(`deleted ${deleted.length} expired/max used invites`, {
        codes: staleInvites.map((invite) => invite.code),
      });
  };
}
