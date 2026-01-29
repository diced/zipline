import { config } from '@/lib/config';
import { join } from 'path';
import typedPlugin from '../typedPlugin';

export const FAVICON_SIZES = [16, 32, 64, 128, 512, 1024];

export const PATH = '/favicon.ico';
export default typedPlugin(
  async (server) => {
    server.get(PATH, (_, res) => {
      return res.sendFile('favicon.ico', join(process.cwd(), 'public'));
    });

    // different sizes of favicon for PWA, if they exist then serve them
    for (const size of FAVICON_SIZES) {
      const str = `${size}x${size}`;
      server.get(`/favicon-${str}.png`, async (_, res) => {
        if (!config.pwa.enabled) return res.callNotFound();

        return res.sendFile(`favicon-${str}.png`, join(process.cwd(), 'public'));
      });
    }
  },
  { name: PATH },
);
