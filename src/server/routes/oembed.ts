import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export const PATH = '/oembed';

export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'oEmbed endpoint to return custom embed metadata for Discord/Telegram.',
          querystring: z.object({
            author: z.string().nullish(),
            author_url: z.string().nullish(),
            provider: z.string().nullish(),
            provider_url: z.string().nullish(),
            title: z.string().nullish(),
          }),
          response: {
            200: z.object({
              version: z.string(),
              type: z.string(),
              title: z.string(),
              author_name: z.string(),
              author_url: z.string(),
              provider_name: z.string(),
              provider_url: z.string(),
            }),
          },
        },
      },
      async (req, res) => {
        const { author, author_url, provider, provider_url, title } = req.query;

        return res
          .type('application/json')
          .header('Cache-Control', 'public, max-age=86400')
          .send({
            version: '1.0',
            type: 'rich',
            title: title ?? 'Zipline',
            author_name: author ?? '',
            author_url: author_url ?? '',
            provider_name: provider ?? 'Zipline',
            provider_url: provider_url ?? '',
          });
      },
    );
  },
  { name: PATH },
);
