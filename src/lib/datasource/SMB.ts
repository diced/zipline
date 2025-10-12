import { Readable } from 'stream';
import { Datasource } from './Datasource';
import { log } from '../logger';
import * as path from 'path';

const logger = log('datasource').c('smb');

export class SMBDatasource extends Datasource {
  public name = 'smb';
  private host: string;
  private share: string;
  private basePath: string;
  private username?: string;
  private password?: string;
  private domain?: string;
  private smbClient: any;

  constructor(config: {
    host: string;
    share: string;
    basePath?: string;
    username?: string;
    password?: string;
    domain?: string;
  }) {
    super();
    this.host = config.host;
    this.share = config.share;
    this.basePath = config.basePath || '';
    this.username = config.username;
    this.password = config.password;
    this.domain = config.domain || 'WORKGROUP';

    logger.info('initialized smb datasource', {
      host: this.host,
      share: this.share,
      basePath: this.basePath,
      domain: this.domain,
      username: this.username ? '***' : undefined,
    });
  }

  private getFullPath(file: string): string {
    // Combine basePath with file path, ensuring proper path separators
    if (this.basePath) {
      return path.posix.join(this.basePath, file);
    }
    return file;
  }

  private async getSmbClient() {
    if (this.smbClient) return this.smbClient;

    try {
      // Dynamically import smb2
      const SMB2 = (await import('smb2')).default || (await import('smb2'));

      // For local accounts (no domain), use empty string or '.'
      // Format: domain\username or just username for local accounts
      const domain = this.domain && this.domain !== 'WORKGROUP' ? this.domain : '.';

      this.smbClient = new (SMB2 as any)({
        share: `\\\\${this.host}\\${this.share}`,
        domain: domain,
        username: this.username || '',
        password: this.password || '',
      });

      logger.info('smb client created', { domain, username: this.username ? '***' : '' });
      return this.smbClient;
    } catch (error: any) {
      logger.error('failed to create smb client', { error: error.message });
      throw new Error(`Failed to initialize SMB client: ${error.message}`);
    }
  }

  async get(file: string): Promise<Readable | null> {
    try {
      const fullPath = this.getFullPath(file);
      logger.info('getting file from smb', { file, fullPath });
      const client = await this.getSmbClient();

      return new Promise((resolve, reject) => {
        client.readFile(fullPath, (err: any, data: Buffer) => {
          if (err) {
            logger.error('failed to get file', { file, fullPath, error: err.message });
            resolve(null);
          } else {
            logger.info('file retrieved successfully', { file, fullPath, size: data.length });
            const stream = Readable.from(data);
            resolve(stream);
          }
        });
      });
    } catch (error: any) {
      logger.error('error getting file', { file, error: error.message });
      return null;
    }
  }

  async put(file: string, data: Buffer, options?: { mimetype?: string }): Promise<void> {
    try {
      const fullPath = this.getFullPath(file);
      logger.info('uploading file to smb', {
        file,
        fullPath,
        size: data.length,
        mimetype: options?.mimetype,
      });
      const client = await this.getSmbClient();

      // Ensure directory exists
      const dir = path.posix.dirname(fullPath);
      if (dir !== '.' && dir !== '/') {
        await this.ensureDirectory(dir);
      }

      return new Promise((resolve, reject) => {
        client.writeFile(fullPath, data, (err: any) => {
          if (err) {
            logger.error('failed to upload file', { file, fullPath, error: err.message });
            reject(new Error(`SMB upload failed: ${err.message}`));
          } else {
            logger.info('file uploaded successfully', { file, fullPath });
            resolve();
          }
        });
      });
    } catch (error: any) {
      logger.error('error uploading file', { file, error: error.message });
      throw error;
    }
  }

  async delete(file: string): Promise<void> {
    try {
      const fullPath = this.getFullPath(file);
      logger.info('deleting file from smb', { file, fullPath });
      const client = await this.getSmbClient();

      return new Promise((resolve, reject) => {
        client.unlink(fullPath, (err: any) => {
          if (err) {
            logger.error('failed to delete file', { file, fullPath, error: err.message });
            reject(new Error(`SMB delete failed: ${err.message}`));
          } else {
            logger.info('file deleted successfully', { file, fullPath });
            resolve();
          }
        });
      });
    } catch (error: any) {
      logger.error('error deleting file', { file, error: error.message });
      throw error;
    }
  }

  async size(file: string): Promise<number> {
    try {
      const fullPath = this.getFullPath(file);
      logger.info('getting file size from smb', { file, fullPath });
      const client = await this.getSmbClient();

      return new Promise((resolve, reject) => {
        client.stat(fullPath, (err: any, stats: any) => {
          if (err) {
            logger.error('failed to get file size', { file, fullPath, error: err.message });
            resolve(0);
          } else {
            const size = stats.size || 0;
            logger.info('file size retrieved', { file, fullPath, size });
            resolve(size);
          }
        });
      });
    } catch (error: any) {
      logger.error('error getting file size', { file, error: error.message });
      return 0;
    }
  }

  async range(file: string, start: number, end: number): Promise<Readable> {
    try {
      const fullPath = this.getFullPath(file);
      logger.info('getting file range from smb', { file, fullPath, start, end });
      const client = await this.getSmbClient();

      return new Promise((resolve, reject) => {
        client.readFile(fullPath, { start, end }, (err: any, data: Buffer) => {
          if (err) {
            logger.error('failed to get file range', { file, fullPath, start, end, error: err.message });
            reject(new Error(`SMB range read failed: ${err.message}`));
          } else {
            logger.info('file range retrieved', { file, fullPath, start, end, size: data.length });
            resolve(Readable.from(data));
          }
        });
      });
    } catch (error: any) {
      logger.error('error getting file range', { file, start, end, error: error.message });
      throw error;
    }
  }

  async totalSize(): Promise<number> {
    logger.warn('totalSize not implemented for SMB datasource');
    return 0;
  }

  async clear(): Promise<void> {
    logger.error('clear operation not supported for SMB datasource (safety measure)');
    throw new Error('Clear operation not supported for SMB datasource');
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      const client = await this.getSmbClient();
      const parts = dirPath.split(path.sep).filter((p) => p);
      let currentPath = '';

      for (const part of parts) {
        currentPath = path.join(currentPath, part);

        await new Promise<void>((resolve) => {
          client.exists(currentPath, (exists: boolean) => {
            if (!exists) {
              client.mkdir(currentPath, (err: any) => {
                if (err && err.code !== 'STATUS_OBJECT_NAME_COLLISION') {
                  logger.error('failed to create directory', { path: currentPath, error: err.message });
                }
                resolve();
              });
            } else {
              resolve();
            }
          });
        });
      }
    } catch (error: any) {
      logger.error('error ensuring directory', { path: dirPath, error: error.message });
    }
  }
}
