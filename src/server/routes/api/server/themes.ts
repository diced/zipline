import { config } from '@/lib/config';
import { Config } from '@/lib/config/validate';
import { ZiplineTheme } from '@/lib/theme';
import { readThemes } from '@/lib/theme/file';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiServerThemesResponse = {
  themes: ZiplineTheme[];
  defaultTheme: Config['website']['theme'];
};

export const PATH = '/api/server/themes';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'List all available themes and indicate which theme is currently configured as the default.',
          response: {
            200: z.object({
              themes: z.array(z.custom<ZiplineTheme>()),
              defaultTheme: z.custom<Config['website']['theme']>(),
            }),
          },
        },
      },
      async (_, res) => {
        const themes = await readThemes();

        return res.send({ themes, defaultTheme: config.website.theme });
      },
    );
  },
  { name: PATH },
);
