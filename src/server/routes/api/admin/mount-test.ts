import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { userMiddleware } from '@/server/middleware/user';
import { administratorMiddleware } from '@/server/middleware/administrator';

export const PATH = '/api/admin/mount-test';

const testMountSchema = z.object({
  type: z.enum(['local', 'webdav', 'smb']),
  host: z.string().optional(),
  port: z.number().optional(),
  path: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  domain: z.string().optional(),
});

export default async function (server: FastifyInstance) {
  server.post<{ Body: z.infer<typeof testMountSchema> }>(
    PATH,
    {
      preHandler: [userMiddleware, administratorMiddleware],
    },
    async (req, reply) => {
      console.log('=== Mount Test API Called ===');
      console.log('User:', req.user);
      console.log('Request Body:', req.body);

      const { type, host, port, path, username, password, domain } = req.body;

      try {
        if (type === 'local') {
          // For local, just check if the path exists
          const fs = await import('fs/promises');

          if (!path) {
            return reply.code(400).send({ error: 'Path is required for local mount' });
          }

          try {
            await fs.access(path);
            return reply.send({
              success: true,
              message: 'Local path is accessible',
              details: { path },
            });
          } catch {
            return reply.code(400).send({
              error: 'Path does not exist or is not accessible',
              details: { path },
            });
          }
        } else if (type === 'webdav') {
          // For WebDAV, attempt HTTP request
          if (!host) {
            return reply.code(400).send({ error: 'WebDAV URL is required' });
          }

          try {
            // Parse the URL - host field now contains full URL
            let url = host;

            // Add protocol if missing
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = 'https://' + url;
            }

            // Parse URL to potentially override port
            const urlObj = new URL(url);
            if (port) {
              urlObj.port = port.toString();
            }

            const finalUrl = urlObj.toString();

            const headers: Record<string, string> = {
              'User-Agent': 'Zipline/1.0',
            };

            if (username && password) {
              const auth = Buffer.from(`${username}:${password}`).toString('base64');
              headers['Authorization'] = `Basic ${auth}`;
            }

            const response = await fetch(finalUrl, {
              method: 'PROPFIND',
              headers,
              signal: AbortSignal.timeout(10000),
            });

            if (response.ok || response.status === 207) {
              return reply.send({
                success: true,
                message: 'WebDAV connection successful',
                details: {
                  url: finalUrl,
                  authenticated: !!username,
                  status: response.status,
                },
              });
            } else if (response.status === 401) {
              return reply
                .code(401)
                .send({ error: 'Authentication required or failed. Check username and password.' });
            } else if (response.status === 404) {
              return reply.code(404).send({ error: 'WebDAV path not found. Check the URL.' });
            } else {
              return reply.code(response.status).send({
                error: `WebDAV server returned status ${response.status}`,
              });
            }
          } catch (error: any) {
            req.log.error(error, 'WebDAV connection test failed');

            if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
              return reply.code(504).send({ error: 'Connection timeout. Check URL and port.' });
            } else if (error.code === 'ENOTFOUND') {
              return reply.code(404).send({ error: 'Host not found. Check the URL.' });
            } else if (error.code === 'ECONNREFUSED') {
              return reply.code(503).send({ error: 'Connection refused. Check URL and port.' });
            } else if (error instanceof TypeError && error.message.includes('Invalid URL')) {
              return reply
                .code(400)
                .send({ error: 'Invalid URL format. Use format: https://domain.com/path' });
            }

            return reply.code(500).send({
              error: 'WebDAV connection failed',
              details: error.message.substring(0, 200),
            });
          }
        } else if (type === 'smb') {
          // For SMB, test connection using smb2 library
          if (!host) {
            return reply.code(400).send({ error: 'SMB server is required (format: server/share/path)' });
          }

          try {
            // Dynamically import SMB library
            const SMB2Module = await import('@marsaud/smb2');
            const SMB2 = (SMB2Module as any).default || SMB2Module;

            // Parse host, share, and path from host field (format: server/share/path)
            const parts = host.split('/');
            const smbHost = parts[0];
            const share = parts[1] || 'share';
            const basePath = parts.slice(2).join('/'); // Everything after share is the base path

            // Handle domain properly for different scenarios
            let effectiveDomain: string | undefined;
            if (domain && domain.trim() !== '' && domain.trim() !== '.') {
              // Use provided domain if it's not empty or '.'
              effectiveDomain = domain.trim();
            } else {
              // For local accounts, don't include domain at all
              // This often works better than empty string or 'WORKGROUP'
              effectiveDomain = undefined;
            }

            console.log('SMB Test - Parsed:', {
              smbHost,
              share,
              basePath,
              originalDomain: domain,
              effectiveDomain,
              username,
            });

            // Try different authentication configurations for @marsaud/smb2
            const smbConfigs = [
              // First try: No domain (often works for local accounts)
              {
                share: `\\\\${smbHost}\\${share}`,
                domain: '',
                username: username || '',
                password: password || '',
                autoCloseTimeout: 0,
              },
              // Second try: With '.' domain for local accounts
              {
                share: `\\\\${smbHost}\\${share}`,
                domain: '.',
                username: username || '',
                password: password || '',
                autoCloseTimeout: 0,
              },
              // Third try: With WORKGROUP domain
              {
                share: `\\\\${smbHost}\\${share}`,
                domain: 'WORKGROUP',
                username: username || '',
                password: password || '',
                autoCloseTimeout: 0,
              },
              // Fourth try: With server IP as domain
              {
                share: `\\\\${smbHost}\\${share}`,
                domain: smbHost,
                username: username || '',
                password: password || '',
                autoCloseTimeout: 0,
              },
            ];

            console.log('SMB Config (primary):', { ...smbConfigs[0], password: password });

            // Test connection by listing the base path or root directory
            const testPath = basePath ? '/' + basePath : '/';

            // Try configurations in order
            const tryConnection = async (configIndex: number): Promise<any> => {
              if (configIndex >= smbConfigs.length) {
                // All configurations failed, return the last error
                throw new Error('All authentication methods failed');
              }

              const config = smbConfigs[configIndex];
              console.log(`Trying SMB config ${configIndex + 1}/${smbConfigs.length}:`, {
                ...config,
                password: '[REDACTED]',
              });

              return new Promise((resolve, reject) => {
                const client = new SMB2(config);

                // Use the new @marsaud/smb2 API with callback
                client.readdir(testPath === '/' ? '' : testPath, (err: any, files: any[]) => {
                  if (err) {
                    console.log(`SMB config ${configIndex + 1} failed:`, err.code, err.message);

                    // If it's an authentication error, try the next config
                    if (err.code === 'STATUS_LOGON_FAILURE' && configIndex < smbConfigs.length - 1) {
                      tryConnection(configIndex + 1)
                        .then(resolve)
                        .catch(reject);
                      return;
                    }

                    // For other errors or if this was the last config, reject
                    reject(err);
                  } else {
                    console.log(`SMB config ${configIndex + 1} succeeded!`);

                    // Close the connection
                    try {
                      client.disconnect();
                    } catch (disconnectErr) {
                      console.log('Warning: Error disconnecting SMB client:', disconnectErr);
                    }

                    resolve({
                      success: true,
                      message: 'SMB connection successful',
                      details: {
                        server: smbHost,
                        share: share,
                        path: basePath || '(root)',
                        testPath: testPath,
                        domain: config.domain || '(none)',
                        authenticated: !!username,
                        filesFound: files?.length || 0,
                        configUsed: configIndex + 1,
                      },
                    });
                  }
                });
              });
            };

            return tryConnection(0)
              .then((result) => {
                reply.send(result);
              })
              .catch((err: any) => {
                req.log.error(err, 'SMB connection test failed');

                if (err.code === 'STATUS_LOGON_FAILURE') {
                  reply.code(401).send({
                    error: 'Authentication failed. Check username and password.',
                    details: err.message,
                  });
                } else if (err.code === 'STATUS_BAD_NETWORK_NAME') {
                  reply.code(404).send({
                    error: 'Share not found. Check server/share name.',
                    details: err.message,
                  });
                } else if (
                  err.code === 'STATUS_OBJECT_NAME_NOT_FOUND' ||
                  err.code === 'STATUS_OBJECT_PATH_NOT_FOUND'
                ) {
                  reply.code(404).send({
                    error: `Path not found: ${testPath}. Check the path in your server configuration.`,
                    details: err.message,
                  });
                } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
                  reply.code(503).send({
                    error: 'Cannot connect to SMB server. Check server address.',
                    details: err.message,
                  });
                } else {
                  reply.code(500).send({
                    error: 'SMB connection failed',
                    details: err.message,
                  });
                }
              });
          } catch (error: any) {
            req.log.error(error, 'SMB connection test error');

            return reply.code(500).send({
              error: 'Failed to test SMB connection',
              details: error.message,
            });
          }
        }

        return reply.code(400).send({ error: 'Invalid mount type' });
      } catch (error: any) {
        req.log.error(error, 'Mount test error');
        return reply.code(500).send({
          error: 'Failed to test mount connection',
          details: error.message,
        });
      }
    },
  );
}
