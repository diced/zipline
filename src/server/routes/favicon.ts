import { config } from '@/lib/config';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import typedPlugin from '../typedPlugin';
import { sanitizeFilename } from '@/lib/fs';

export const FAVICON_SIZES = [16, 32, 64, 128, 512];
export const PUBLIC_DIR = join(process.cwd(), 'public');

function loadFavicon(file: string): Buffer | null {
  const path = join(PUBLIC_DIR, file);
  if (!existsSync(path)) return null;

  return readFileSync(path);
}

const FAVICONS: Record<string, Buffer | null> = {
  'favicon.ico': loadFavicon('favicon.ico'),
  ...Object.fromEntries(
    FAVICON_SIZES.map((size) => {
      const name = `favicon-${size}x${size}.png`;
      return [name, loadFavicon(name)];
    }),
  ),
};

export const PATH = '/favicon*';
export default typedPlugin(
  async (server) => {
    server.get<{ Params: { '*': string } }>(PATH, (req, res) => {
      const filename = sanitizeFilename(`favicon${req.params['*']}`);
      if (!filename) return res.callNotFound();

      const buffer = FAVICONS[filename];

      if (!buffer) return res.callNotFound();
      if (filename.startsWith('favicon-') && !config.pwa.enabled) return res.callNotFound();

      return res
        .type(filename.endsWith('.ico') ? 'image/x-icon' : 'image/png')
        .header('Cache-Control', 'public, max-age=86400')
        .send(buffer);
    });
  },
  { name: PATH },
);
