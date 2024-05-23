import { prisma } from '..';

export async function getZipline() {
  const zipline = await prisma.zipline.findFirst();
  if (!zipline) {
    return prisma.zipline.create({
      data: {},
    });
  }

  return zipline;
}
