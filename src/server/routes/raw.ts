import { parseRange } from '@/lib/api/range';
import { verifyPassword } from '@/lib/crypto';
import { datasource } from '@/lib/datasource';
import { prisma } from '@/lib/db';
import fastifyPlugin from 'fastify-plugin';
import { parse } from 'url';

type Params = {
  id: string;
};

type Querystring = {
  pw?: string;
  download?: string;
};

export const PATH = '/raw/:id';
export default fastifyPlugin(
  (server, _, done) => {
    server.get<{
      Querystring: Querystring;
      Params: Params;
    }>(PATH, async (req, res) => {
      const { id } = req.params;
      const { pw, download } = req.query;

      const parsedUrl = parse(req.url!, true);

      const file = await prisma.file.findFirst({
        where: {
          name: id,
        },
      });

      if (file?.password) {
        if (!pw) return res.forbidden('Password protected.');
        const verified = await verifyPassword(pw, file.password!);

        if (!verified) return res.forbidden('Incorrect password.');
      }

      const size = file?.size || (await datasource.size(file?.name ?? id));

      if (req.headers.range) {
        const [start, end] = parseRange(req.headers.range, size);
        if (start >= size || end >= size) {
          const buf = await datasource.get(file?.name ?? id);
          if (!buf) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

          return res
            .type(file?.type || 'application/octet-stream')
            .headers({
              'Content-Length': size,
              ...(file?.originalName && {
                'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${file.originalName}"`,
              }),
            })
            .status(416)
            .send(buf);
        }

        const buf = await datasource.range(file?.name ?? id, start || 0, end);
        if (!buf) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

        return res
          .type(file?.type || 'application/octet-stream')
          .headers({
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            ...(file?.originalName && {
              'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${file.originalName}"`,
            }),
          })
          .status(206)
          .send(buf);
      }

      const buf = await datasource.get(file?.name ?? id);
      if (!buf) return req.server.nextServer.render404(req.raw, res.raw, parsedUrl);

      return res
        .type(file?.type || 'application/octet-stream')
        .headers({
          'Content-Length': size,
          'Accept-Ranges': 'bytes',
          ...(file?.originalName && {
            'Content-Disposition': `${download ? 'attachment; ' : ''}filename="${file.originalName}"`,
          }),
        })
        .status(200)
        .send(buf);
    });

    done();
  },
  { name: PATH },
);
