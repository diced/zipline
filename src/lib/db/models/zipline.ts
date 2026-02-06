import { tmpdir } from 'os';
import { prisma } from '..';
import { join } from 'path';

export async function getZipline() {
  const zipline = await prisma.zipline.findFirst();
  if (!zipline) {
    const tmp = join(tmpdir(), 'zipline');
    return prisma.zipline.create({
      data: {
        coreTempDirectory: tmp,
      },
    });
  }

  return zipline;
}
