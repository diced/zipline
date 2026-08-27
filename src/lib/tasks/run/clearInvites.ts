import { db } from '@/lib/db';
import { invites } from '@/lib/db/schema';
import { and, gte, isNotNull, lte, or } from 'drizzle-orm';
import { IntervalTask } from '..';

export default function clearInvites() {
  return async function (this: IntervalTask) {
    const now = new Date();
    const deleted = await db
      .delete(invites)
      .where(
        or(lte(invites.expiresAt, now), and(isNotNull(invites.maxUses), gte(invites.uses, invites.maxUses))),
      )
      .returning({ code: invites.code });

    if (deleted.length)
      this.logger.info(`deleted ${deleted.length} expired/max used invites`, {
        codes: deleted.map((invite) => invite.code),
      });
  };
}
