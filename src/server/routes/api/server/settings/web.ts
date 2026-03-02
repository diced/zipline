import { config } from '@/lib/config';
import { safeConfig } from '@/lib/config/safe';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { readFile } from 'fs/promises';
import { join } from 'path';
import z from 'zod';

export type ApiServerSettingsWebResponse = {
  config: ReturnType<typeof safeConfig>;
  codeMap: { ext: string; mime: string; name: string }[];
};

const logger = log('api').c('server').c('settings').c('web');

const codeJsonPath = join(process.cwd(), 'code.json');
let codeMap: ApiServerSettingsWebResponse['codeMap'] = [];

export const PATH = '/api/server/settings/web';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description: 'Return the safe dashboard configuration and MIME type code map used by the web UI.',
          response: {
            200: z.custom<ApiServerSettingsWebResponse>(),
          },
        },
        preHandler: [userMiddleware],
      },
      async (_, res) => {
        const webConfig = safeConfig(config);

        if (codeMap.length === 0) {
          try {
            const codeJson = await readFile(codeJsonPath, 'utf8');
            codeMap = JSON.parse(codeJson);
          } catch (error) {
            logger.error('failed to read code.json', { error });
            codeMap = [];
          }
        }

        return res.send({
          config: webConfig,
          codeMap: codeMap,
        } satisfies ApiServerSettingsWebResponse);
      },
    );
  },
  { name: PATH },
);
