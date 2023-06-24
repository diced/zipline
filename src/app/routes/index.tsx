import { LoaderArgs, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { prisma } from '~/db.server';

export async function loader({}: LoaderArgs) {
  let zipline = await prisma.zipline.findFirst();
  if (!zipline) {
    zipline = await prisma.zipline.create({ data: {} });
  }

  return json({ zipline });
}

export default function Index() {
  const { zipline } = useLoaderData<typeof loader>();

  return (
    <div>
      <pre>{JSON.stringify(zipline, null, 2)}</pre>
    </div>
  );
}
