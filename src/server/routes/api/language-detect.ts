import { log } from '@/lib/logger';
import fastifyPlugin from 'fastify-plugin';

const logger = log('api').c('language-detect');

export const PATH = '/api/language-detect';

interface LanguageDetectRequest {
  text: string;
  verbose?: boolean;
}

interface LanguageDetectResponse {
  languageId: string;
  languageName: string;
  confidence: number;
  reliable: boolean;
}

export default fastifyPlugin(
  (server, _, done) => {
    server.post<{
      Body: LanguageDetectRequest;
    }>(
      PATH,
      {
        schema: {
          body: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              verbose: { type: 'boolean' },
            },
            required: ['text'],
          },
        },
      },
      async (req, res) => {
        try {
          const { text, verbose = false } = req.body;

          if (!text || text.trim().length === 0) {
            return res.status(400).send({ error: 'Text is required' });
          }

          const detectUrl = process.env.LANGUAGE_DETECT_URL;
          if (!detectUrl) {
            throw new Error('Missing LANGUAGE_DETECT_URL environment variable');
          }

          const response = await fetch(detectUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              verbose,
            }),
          });

          if (!response.ok) {
            throw new Error(`Language detection service returned ${response.status}`);
          }

          const data: LanguageDetectResponse = await response.json();

          logger.info('Language detected', {
            languageId: data.languageId,
            languageName: data.languageName,
            confidence: data.confidence,
            reliable: data.reliable,
          });

          return res.send(data);
        } catch (error) {
          logger.error('Language detection failed', { error: (error as Error).message });

          return res.send({
            languageId: 'txt',
            languageName: 'Plain Text',
            confidence: 0,
            reliable: false,
          } as LanguageDetectResponse);
        }
      },
    );

    done();
  },
  { name: PATH },
);
