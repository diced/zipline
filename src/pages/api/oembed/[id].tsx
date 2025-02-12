import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';
import 'lib/prisma';
import 'lib/config';

async function handler(req: NextApiReq, res: NextApiRes) {
  const { id } = req.query as { id: string };
  if (req.method === 'GET') {
    if (!id || isNaN(parseInt(id))) return res.badRequest('no id');

    const file = await prisma.file.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        thumbnail: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            username: true,
          },
        },
      },
    });
    if (!file || !!file.password) return res.notFound('no such file exists');

    const mediaType: 'image' | 'video' | 'audio' | 'other' =
      (new RegExp(/^(?<type>image|video|audio)/).exec(file.mimetype)?.groups?.type as
        | 'image'
        | 'video'
        | 'audio') || 'other';

    let host = req.headers.host;
    const proto = req.headers['x-forwarded-proto'];
    try {
      if (
        JSON.parse(req.headers['cf-visitor'] as string).scheme === 'https' ||
        proto === 'https' ||
        config.core.return_https
      )
        host = `https://${host}`;
      else host = `http://${host}`;
    } catch (e) {
      if (proto === 'https' || config.core.return_https) host = `https://${host}`;
      else host = `http://${host}`;
    }

    if (mediaType === 'image')
      return res.json({
        type: 'photo',
        version: '1.0',
        url: `${host}/r/${file.name}`,
      });
    if (mediaType === 'video')
      return res.json({
        type: 'video',
        version: '1.0',
        url: `${host}/r/${file.name}`,
        thumbnail_url: file.thumbnail ? `${host}/r/${file.thumbnail?.name}` : undefined,
        html: `<video><source src="${host}/r/${file.name}" type="${file.mimetype}"/></video>`,
      });
    return res.json({
      type: 'link',
      version: '1.0',
      url: `${host}${config.uploader.route}/${file.name}`,
    });
  }
}

export default withZipline(handler, {
  methods: ['GET'],
  user: false,
});
