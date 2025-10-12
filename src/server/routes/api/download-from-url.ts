import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { log } from '@/lib/logger';

// Required by our route autoloader to register this plugin
export const PATH = '/api/download-from-url';

const logger = log('api').c('download-from-url');

interface DownloadRequest {
  Body: {
    url: string;
  };
}

async function downloadFromUrlRoute(fastify: FastifyInstance) {
  fastify.post<DownloadRequest>(PATH, async (req: FastifyRequest<DownloadRequest>, reply: FastifyReply) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return reply.status(400).send({ error: 'URL is required' });
      }

      // Validate URL format
      let downloadUrl: URL;
      try {
        downloadUrl = new URL(url);
      } catch {
        return reply.status(400).send({ error: 'Invalid URL format' });
      }

      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(downloadUrl.protocol)) {
        return reply.status(400).send({ error: 'Only HTTP and HTTPS URLs are allowed' });
      }

      logger.info(`Downloading file from URL: ${url}`);

      // Fetch the file from the URL
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Zipline-FileDownloader/1.0',
        },
      });

      if (!response.ok) {
        return reply.status(400).send({
          error: `Failed to download file: ${response.status} ${response.statusText}`,
        });
      }

      // Get content type and set appropriate headers
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentLength = response.headers.get('content-length');

      // Set response headers
      reply.header('Content-Type', contentType);
      if (contentLength) {
        reply.header('Content-Length', contentLength);
      }

      // Convert response to buffer and send
      const buffer = Buffer.from(await response.arrayBuffer());

      logger.info(`Successfully downloaded file from URL: ${url}, size: ${buffer.length} bytes`);

      return reply.send(buffer);
    } catch (error) {
      logger.error(
        'Download error:',
        error instanceof Error ? { message: error.message, stack: error.stack } : { error },
      );
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  });
}

export default fastifyPlugin(downloadFromUrlRoute);
