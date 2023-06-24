import { LoaderArgs, json } from '@remix-run/node';
import { prisma } from '~/db.server';

export async function loader({ context, request }: LoaderArgs) {
  try {
    // test database connection
    await prisma.user.count();

    return json({ pong: true }, { status: 200 });
  } catch (e) {
    return json({ pong: false }, { status: 500 });
  }
}
