import { Readable } from 'stream';
import { Datasource } from './Datasource';
import { log } from '../logger';

const logger = log('datasource').c('webdav');

export class WebDAVDatasource extends Datasource {
  public name = 'webdav';
  private baseUrl: string;
  private username?: string;
  private password?: string;

  constructor(config: { url: string; username?: string; password?: string }) {
    super();
    this.baseUrl = config.url.endsWith('/') ? config.url : config.url + '/';
    this.username = config.username;
    this.password = config.password;

    logger.info('initialized webdav datasource', { url: this.baseUrl });
  }

  private getAuthHeader(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.username && this.password) {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    return headers;
  }

  async get(file: string): Promise<Readable | null> {
    try {
      const url = this.baseUrl + encodeURIComponent(file);
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        logger.error('failed to get file', { file, status: response.status });
        return null;
      }

      if (!response.body) {
        logger.error('no body in response', { file });
        return null;
      }

      return Readable.fromWeb(response.body as any);
    } catch (error: any) {
      logger.error('error getting file', { file, error: error.message });
      return null;
    }
  }

  async put(file: string, data: Buffer, options?: { mimetype?: string }): Promise<void> {
    try {
      const url = this.baseUrl + encodeURIComponent(file);
      const headers = {
        ...this.getAuthHeader(),
        'Content-Type': options?.mimetype || 'application/octet-stream',
        'Content-Length': data.length.toString(),
      };

      logger.debug('uploading file to webdav', { file, size: data.length, url });

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: new Uint8Array(data),
      });

      if (!response.ok) {
        throw new Error(`WebDAV PUT failed with status ${response.status}: ${response.statusText}`);
      }

      logger.info('file uploaded successfully', { file, size: data.length });
    } catch (error: any) {
      logger.error('error uploading file', { file, error: error.message });
      throw error;
    }
  }

  async delete(file: string): Promise<void> {
    try {
      const url = this.baseUrl + encodeURIComponent(file);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeader(),
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`WebDAV DELETE failed with status ${response.status}: ${response.statusText}`);
      }

      logger.info('file deleted successfully', { file });
    } catch (error: any) {
      logger.error('error deleting file', { file, error: error.message });
      throw error;
    }
  }

  async size(file: string): Promise<number> {
    try {
      const url = this.baseUrl + encodeURIComponent(file);
      const response = await fetch(url, {
        method: 'HEAD',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        logger.error('failed to get file size', { file, status: response.status });
        return 0;
      }

      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch (error: any) {
      logger.error('error getting file size', { file, error: error.message });
      return 0;
    }
  }

  async totalSize(): Promise<number> {
    // WebDAV doesn't have a simple way to get total size
    // This would require listing all files and summing their sizes
    logger.warn('totalSize not implemented for WebDAV datasource');
    return 0;
  }

  async clear(): Promise<void> {
    // This is dangerous and not recommended for WebDAV
    logger.warn('clear() called on WebDAV datasource - not implemented for safety');
    throw new Error('clear() is not supported for WebDAV datasource');
  }

  async range(file: string, start: number, end: number): Promise<Readable> {
    try {
      const url = this.baseUrl + encodeURIComponent(file);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.getAuthHeader(),
          Range: `bytes=${start}-${end}`,
        },
      });

      if (!response.ok) {
        throw new Error(`WebDAV range request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No body in response');
      }

      return Readable.fromWeb(response.body as any);
    } catch (error: any) {
      logger.error('error getting file range', { file, start, end, error: error.message });
      throw error;
    }
  }
}
