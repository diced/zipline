import config from 'lib/config';
import prisma from 'lib/prisma';
import { formatRootUrl } from 'lib/utils/urls';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  const take = Number(req.query.take ?? 4);

  if (take >= 50) return res.badRequest("take can't be more than 50");

  let files = await prisma.file.findMany({
    take,
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      createdAt: true,
      expiresAt: true,
      name: true,
      mimetype: true,
      id: true,
      views: true,
      maxViews: true,
      folderId: true,
      size: true,
      favorite: true,
      thumbnail: true,
    },
  });

  for (let i = 0; i !== files.length; ++i) {
    (files[i] as unknown as { url: string }).url = formatRootUrl(config.uploader.route, files[i].name);
    if (files[i].thumbnail) {
      (files[i].thumbnail as unknown as string) = formatRootUrl('/r', files[i].thumbnail.name);
    }
  }

  if (req.query.filter && req.query.filter === 'media')
    files = files.filter((x) => /^(video|audio|image)/.test(x.mimetype));

  return res.json(files);
}

export default withZipline(handler, {
  methods: ['GET'],
  user: true,
});
