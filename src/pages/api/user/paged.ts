import { Prisma } from '@prisma/client';
import { s } from '@sapphire/shapeshift';
import config from 'lib/config';
import prisma from 'lib/prisma';
import { formatRootUrl } from 'lib/utils/urls';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';

const pageCount = 16;

const sortByValidator = s.enum(
  ...([
    'createdAt',
    'views',
    'expiresAt',
    'size',
    'name',
    'mimetype',
  ] satisfies (keyof Prisma.FileOrderByWithRelationInput)[])
);

const orderValidator = s.enum('asc', 'desc');

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  const { page, filter, count, favorite, ...rest } = req.query as {
    page: string;
    filter: string;
    count: string;
    favorite: string;
    sortBy: string;
    order: string;
  };

  const where = {
    userId: user.id,
    favorite: !!favorite,

    ...(filter === 'media' && {
      OR: [
        {
          mimetype: { startsWith: 'image/' },
        },
        {
          mimetype: { startsWith: 'video/' },
        },
        {
          mimetype: { startsWith: 'audio/' },
        },
        {
          mimetype: { startsWith: 'text/' },
        },
      ],
    }),
  } satisfies Prisma.FileWhereInput;

  if (count) {
    const count = await prisma.file.count({
      where,
    });

    const pages = Math.ceil(count / pageCount);

    return res.json({ count: pages });
  }

  if (!page) return res.badRequest('no page');
  if (isNaN(Number(page))) return res.badRequest('page is not a number');

  // validate sortBy
  const sortBy = sortByValidator.run(rest.sortBy || 'createdAt');
  if (!sortBy.isOk()) return res.badRequest('invalid sortBy option');

  // validate order
  const order = orderValidator.run(rest.order || 'desc');
  if (!sortBy.isOk()) return res.badRequest('invalid order option');

  const files: {
    favorite: boolean;
    createdAt: Date;
    id: number;
    name: string;
    mimetype: string;
    expiresAt: Date;
    maxViews: number;
    views: number;
    folderId: number;
    size: number;
    password: string | boolean;
    thumbnail?: { name: string };
  }[] = await prisma.file.findMany({
    where,
    orderBy: {
      [sortBy.value]: order.value,
    },
    select: {
      createdAt: true,
      expiresAt: true,
      name: true,
      mimetype: true,
      id: true,
      favorite: true,
      views: true,
      maxViews: true,
      folderId: true,
      size: true,
      password: true,
      thumbnail: true,
    },
    skip: page ? (Number(page) - 1) * pageCount : undefined,
    take: page ? pageCount : undefined,
  });

  for (let i = 0; i !== files.length; ++i) {
    const file = files[i];
    if (file.password) file.password = true;

    (file as unknown as { url: string }).url = formatRootUrl(config.uploader.route, file.name);
    if (files[i].thumbnail) {
      (files[i].thumbnail as unknown as string) = formatRootUrl('/r', files[i].thumbnail.name);
    }
  }

  return res.json(files);
}

export default withZipline(handler, {
  methods: ['GET'],
  user: true,
});
