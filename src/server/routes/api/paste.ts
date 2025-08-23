import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

export interface PasteRequest {
  fileId: string;
}

export interface PasteResponse {
  success: boolean;
  pasteId?: string;
  pasteUrl?: string;
  alreadyExists: boolean;
}

export interface PasteInfoResponse {
  pasteId?: string | null;
  pasteUrl?: string | null;
  pasteCreatedAt?: Date | null;
  exists: boolean;
}

const logger = log('api').c('paste');

export const PATH = '/api/paste';

export default fastifyPlugin(
  (server: FastifyInstance, _, done) => {
    // Create paste endpoint
    server.post<{
      Body: PasteRequest;
    }>(
      PATH,
      {
        preHandler: userMiddleware,
        schema: {
          body: {
            type: 'object',
            properties: {
              fileId: { type: 'string' },
            },
            required: ['fileId'],
          },
        },
      },
      async (req, res) => {
        const { fileId } = req.body;
        const user = req.user;

        if (!user) {
          return res.status(401).send({ error: 'Unauthorized' });
        }

        try {
          // Get the file
          const file = await prisma.file.findFirst({
            where: {
              id: fileId,
              userId: user.id,
            },
          });

          if (!file) {
            return res.status(404).send({ error: 'File not found' });
          }

          // Check if paste already exists
          if (file.pasteId && file.pasteUrl) {
            return res.send({
              success: true,
              pasteId: file.pasteId,
              pasteUrl: file.pasteUrl,
              alreadyExists: true,
            } as PasteResponse);
          }

          // Read the file content
          const fileUrl = `${req.protocol}://${req.hostname}${req.hostname === 'localhost' ? ':4000' : ''}/raw/${file.name}`;
          const response = await fetch(fileUrl);
          const fileContent = await response.text();
          // Upload to paste service
          const pasteResponse = await fetch('https://code.whitedragon.life/api/v2/paste', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pasties: [
                {
                  title: `FuryCdn-${file.originalName || file.name}`,
                  language: 'Autodetect',
                  code: fileContent,
                },
              ],
            }),
          });

          if (!pasteResponse.ok) {
            throw new Error('Failed to upload to paste service');
          }

          const pasteResult = await pasteResponse.json();
          const pasteId = pasteResult._id;
          const pasteUrl = `https://code.whitedragon.life/${pasteId}`;

          // Update the file record with paste information
          await prisma.file.update({
            where: { id: fileId },
            data: {
              pasteId,
              pasteUrl,
              pasteCreatedAt: new Date(),
            },
          });

          return res.send({
            success: true,
            pasteId,
            pasteUrl,
            alreadyExists: false,
          } as PasteResponse);
        } catch (error) {
          logger.error('Error creating paste a').error(error as Error);
          return res.status(500).send({ error: 'Failed to create paste' });
        }
      },
    );
    // Get paste info endpoint
    server.get<{
      Params: { fileId: string };
    }>(
      `${PATH}/:fileId`,
      {
        preHandler: userMiddleware,
        schema: {
          params: {
            type: 'object',
            properties: {
              fileId: { type: 'string' },
            },
            required: ['fileId'],
          },
        },
      },
      async (req, res) => {
        const { fileId } = req.params;
        const user = req.user;

        if (!user) {
          return res.status(401).send({ error: 'Unauthorized' });
        }

        try {
          const file = await prisma.file.findFirst({
            where: {
              id: fileId,
              userId: user.id,
            },
            select: {
              pasteId: true,
              pasteUrl: true,
              pasteCreatedAt: true,
            },
          });

          if (!file) {
            return res.status(404).send({ error: 'File not found' });
          }

          return res.send({
            pasteId: file.pasteId,
            pasteUrl: file.pasteUrl,
            pasteCreatedAt: file.pasteCreatedAt,
            exists: !!(file.pasteId && file.pasteUrl),
          } as PasteInfoResponse);
        } catch (error) {
          logger.error('Error getting paste info').error(error as Error);
          return res.status(500).send({ error: 'Failed to get paste info' });
        }
      },
    );
    done();
  },
  { name: PATH },
);
