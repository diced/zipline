import { config } from '@/lib/config';
import fastifyPlugin from 'fastify-plugin';
import { join } from 'path';

export const FAVICON_SIZES = [16, 32, 64, 128, 512];

export const PATH = '/favicon.ico';
export default fastifyPlugin(
  (server, _, done) => {
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

    done();
  },
  { name: PATH },
);
