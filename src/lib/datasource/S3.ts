import { Readable } from 'stream';
import { Datasource } from './Datasource';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import Logger, { log } from '../logger';
import { ReadableStream } from 'stream/web';

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
    },
  ) {
    super();

    this.client = new S3Client({
      credentials: {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey,
      },
      region: this.options.region ?? undefined,
    });

    this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      const res = await this.client.send(new ListBucketsCommand());
      if (res.$metadata.httpStatusCode !== 200) {
        this.logger
          .error('there was an error while listing buckets', res.$metadata as Record<string, unknown>)
          .error('zipline will now exit');
        process.exit(1);
      }

      if (!res.Buckets?.find((bucket) => bucket.Name === this.options.bucket)) {
        this.logger.error(`bucket ${this.options.bucket} does not exist`).error('zipline will now exit');
        process.exit(1);
      }
    } catch (e) {
      this.logger
        .error('there was an error while listing buckets', e as Record<string, unknown>)
        .error('zipline will now exit');
      process.exit(1);
    } finally {
      this.logger.debug(`bucket ${this.options.bucket} exists`);
    }
  }

  public async get(file: string): Promise<Readable | null> {
    const command = new GetObjectCommand({
      Bucket: this.options.bucket,
      Key: file,
    });

    try {
      const res = await this.client.send(command);

      if (res.$metadata.httpStatusCode !== 200) {
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

  public async put(file: string, data: Buffer): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: file,
      Body: data,
    });

    try {
      const res = await this.client.send(command);

      if (res.$metadata.httpStatusCode !== 200) {
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
      Key: file,
    });

    try {
      const res = await this.client.send(command);

      if (res.$metadata.httpStatusCode !== 200) {
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
      Key: file,
    });

    try {
      const res = await this.client.send(command);

      if (res.$metadata.httpStatusCode !== 200) {
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
    });

    try {
      const res = await this.client.send(command);

      if (res.$metadata.httpStatusCode !== 200) {
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

      if (res.$metadata.httpStatusCode !== 200) {
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
      Key: file,
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
