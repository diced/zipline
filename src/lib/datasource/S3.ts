import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { Readable } from 'stream';
import { ReadableStream } from 'stream/web';
import Logger, { log } from '../logger';
import { randomCharacters } from '../random';
import { Datasource } from './Datasource';

function isOk(code: number) {
  return code >= 200 && code < 300;
}

export class S3Datasource extends Datasource {
  name = 's3';
  client: S3Client;
  logger: Logger = log('datasource').c('s3');

  constructor(
    public options: {
      accessKeyId: string;
      secretAccessKey: string;
      region?: string;
      bucket: string;
      endpoint?: string | null;
      forcePathStyle?: boolean;
      subdirectory?: string | null;
    },
  ) {
    super();

    this.client = new S3Client({
      credentials: {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey,
      },
      region: this.options.region ?? undefined,
      endpoint: this.options.endpoint ?? undefined,
      forcePathStyle: this.options.forcePathStyle ?? false,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 10_000,
        socketTimeout: 120_000,
        httpAgent: new HttpAgent({
          maxSockets: 1000,
          keepAlive: true,
        }),
        httpsAgent: new HttpsAgent({
          maxSockets: 1000,
          keepAlive: true,
          rejectUnauthorized: false,
        }),
      }),
    });

    this.ensureReadWriteAccess();
  }

  private key(path: string): string {
    if (this.options.subdirectory) {
      return this.options.subdirectory.endsWith('/')
        ? this.options.subdirectory + path
        : this.options.subdirectory + '/' + path;
    }

    return path;
  }

  private async ensureReadWriteAccess() {
    try {
      const putObject = new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: this.key(`${randomCharacters(10)}-zipline`),
        Body: randomCharacters(10),
      });

      const readObject = new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: putObject.input.Key,
      });

      const deleteObject = new DeleteObjectCommand({
        Bucket: this.options.bucket,
        Key: putObject.input.Key,
      });

      const writeRes = await this.client.send(putObject);
      if (!isOk(writeRes.$metadata.httpStatusCode || 0)) {
        this.logger
          .error(
            'there was an error while testing write access',
            writeRes.$metadata as Record<string, unknown>,
          )
          .error('zipline will now exit');
        process.exit(1);
      }

      const readRes = await this.client.send(readObject);
      if (!isOk(readRes.$metadata.httpStatusCode || 0)) {
        this.logger
          .error('there was an error while testing read access', readRes.$metadata as Record<string, unknown>)
          .error('zipline will now exit');
        process.exit(1);
      }

      const deleteRes = await this.client.send(deleteObject);
      if (!isOk(deleteRes.$metadata.httpStatusCode || 0)) {
        this.logger
          .error(
            'there was an error while testing write access',
            deleteRes.$metadata as Record<string, unknown>,
          )
          .error('zipline will now exit');
        process.exit(1);
      }

      this.logger.debug('access test successful');
    } catch (e) {
      this.logger
        .error('there was an error while testing access', e as Record<string, unknown>)
        .error('zipline will now exit');
      process.exit(1);
    } finally {
      this.logger.debug(`able to read/write bucket ${this.options.bucket}`);
    }
  }

  public async get(file: string): Promise<Readable | null> {
    const command = new GetObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(file),
    });

    try {
      const res = await this.client.send(command);

      if (!isOk(res.$metadata.httpStatusCode || 0)) {
        this.logger.error(
          'there was an error while getting object',
          res.$metadata as Record<string, unknown>,
        );

        return null;
      }

      return Readable.fromWeb(res.Body!.transformToWebStream() as ReadableStream<any>);
    } catch (e) {
      this.logger.error('there was an error while getting object', e as Record<string, unknown>);

      return null;
    }
  }

  public async put(
    file: string,
    data: Buffer,
    options: {
      mimetype?: string;
    } = {},
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(file),
      Body: data,
      ...(options.mimetype ? { ContentType: options.mimetype } : {}),
    });

    try {
      const res = await this.client.send(command);

      if (!isOk(res.$metadata.httpStatusCode || 0)) {
        this.logger.error(
          'there was an error while putting object',
          res.$metadata as Record<string, unknown>,
        );
      }
    } catch (e) {
      this.logger.error('there was an error while putting object', e as Record<string, unknown>);
    }
  }

  public async delete(file: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(file),
    });

    try {
      const res = await this.client.send(command);

      if (!isOk(res.$metadata.httpStatusCode || 0)) {
        this.logger.error('there was an error while deleting object');
        this.logger.error('error metadata', res.$metadata as Record<string, unknown>);
      }
    } catch (e) {
      this.logger.error('there was an error while deleting object');
      this.logger.error('error metadata', e as Record<string, unknown>);
    }
  }

  public async size(file: string): Promise<number> {
    const command = new GetObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(file),
    });

    try {
      const res = await this.client.send(command);

      if (!isOk(res.$metadata.httpStatusCode || 0)) {
        this.logger.error('there was an error while getting object');
        this.logger.error('error metadata', res.$metadata as Record<string, unknown>);

        return 0;
      }

      return Number(res.ContentLength);
    } catch (e) {
      this.logger.error('there was an error while getting object');
      this.logger.error('error metadata', e as Record<string, unknown>);

      return 0;
    }
  }

  public async totalSize(): Promise<number> {
    const command = new ListObjectsCommand({
      Bucket: this.options.bucket,
      Prefix: this.options.subdirectory ?? undefined,
      Delimiter: this.options.subdirectory ? undefined : '/',
    });

    try {
      const res = await this.client.send(command);

      if (!isOk(res.$metadata.httpStatusCode || 0)) {
        this.logger.error('there was an error while listing objects');
        this.logger.error('error metadata', res.$metadata as Record<string, unknown>);

        return 0;
      }

      return res.Contents?.reduce((acc, obj) => acc + Number(obj.Size), 0) ?? 0;
    } catch (e) {
      this.logger.error('there was an error while listing objects');
      this.logger.error('error metadata', e as Record<string, unknown>);

      return 0;
    }
  }

  public async clear(): Promise<void> {
    const command = new DeleteObjectsCommand({
      Bucket: this.options.bucket,
      Delete: {
        Objects: [],
      },
    });

    try {
      const res = await this.client.send(command);

      if (!isOk(res.$metadata.httpStatusCode || 0)) {
        this.logger.error('there was an error while deleting objects');
        this.logger.error('error metadata', res.$metadata as Record<string, unknown>);
      }
    } catch (e) {
      this.logger.error('there was an error while deleting objects');
      this.logger.error('error metadata', e as Record<string, unknown>);
    }
  }

  public async range(file: string, start: number, end: number): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(file),
      Range: `bytes=${start}-${end}`,
    });

    try {
      const res = await this.client.send(command);

      if (res.$metadata.httpStatusCode !== 206) {
        this.logger.error('there was an error while getting object range');
        this.logger.error('error metadata', res.$metadata as Record<string, unknown>);

        return Readable.fromWeb(new ReadableStream());
      }

      return Readable.fromWeb(res.Body!.transformToWebStream() as ReadableStream<any>);
    } catch (e) {
      this.logger.error('there was an error while getting object range');
      this.logger.error('error metadata', e as Record<string, unknown>);

      return Readable.fromWeb(new ReadableStream());
    }
  }
}
