import { prisma } from '..';
import { resolve } from 'path';

export async function getZipline() {
  const zipline = await prisma.zipline.findFirst();
  if (!zipline) {
    return prisma.zipline.create({
      data: {
        coreTempDirectory: resolve('./uploads/.tmp'),
      },
    });
  }

  return zipline;
}
