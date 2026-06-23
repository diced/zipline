import {
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCopyCommand,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { createReadStream } from 'fs';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { Readable } from 'stream';
import { ReadableStream } from 'stream/web';
import Logger, { log } from '../logger';
import { randomCharacters } from '../random';
import { Datasource, ListOptions, PutOptions } from './Datasource';

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
        }),
      }),
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    this.ensureReadWriteAccess();
  }

  public key(path: string): string {
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
      console.error(e);
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

  public async put(file: string, data: Buffer | string, options: PutOptions = {}): Promise<void> {
    let command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(file),
      Body: data,
      ...(options.mimetype ? { ContentType: options.mimetype } : {}),
    });

    if (typeof data === 'string') {
      const readStream = createReadStream(data);
      command = new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: this.key(file),
        Body: readStream,
        ...(options.mimetype ? { ContentType: options.mimetype } : {}),
      });

      this.logger.debug('putting object from stream', { file, key: this.key(file) });
    }

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

  public async delete(file: string | string[]): Promise<void> {
    let command: DeleteObjectCommand | DeleteObjectsCommand;

    if (Array.isArray(file)) {
      command = new DeleteObjectsCommand({
        Bucket: this.options.bucket,
        Delete: {
          Objects: file.map((f) => ({ Key: this.key(f) })),
        },
      });
    } else {
      command = new DeleteObjectCommand({
        Bucket: this.options.bucket,
        Key: this.key(file),
      });
    }

    try {
      const res = await this.client.send(command as never);

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
    const command = new HeadObjectCommand({
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
    let total = 0;
    let continuationToken: string | undefined;

    try {
      do {
        const res = await this.client.send(
          new ListObjectsV2Command({
            Bucket: this.options.bucket,
            Prefix: this.options.subdirectory ?? undefined,
            ContinuationToken: continuationToken,
          }),
        );

        if (!isOk(res.$metadata.httpStatusCode || 0)) {
          this.logger.error('there was an error while listing objects');
          this.logger.error('error metadata', res.$metadata as Record<string, unknown>);

          return 0;
        }

        total += res.Contents?.reduce((acc, obj) => acc + Number(obj.Size ?? 0), 0) ?? 0;
        continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (continuationToken);

      return total;
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

  public async rename(from: string, to: string): Promise<void> {
    const size = await this.size(from);

    if (size !== 0 && size > 5 * 1024 * 1024 * 1024) {
      this.logger.debug('object larger than 5GB, using multipart copy for rename', { from, to, size });

      const createCommand = new CreateMultipartUploadCommand({
        Bucket: this.options.bucket,
        Key: this.key(to),
      });

      let uploadId: string;
      try {
        const createRes = await this.client.send(createCommand);
        if (!isOk(createRes.$metadata.httpStatusCode || 0)) {
          this.logger.error('there was an error while initiating multipart upload');
          this.logger.error('error metadata', createRes.$metadata as Record<string, unknown>);
          throw new Error('Failed to initiate multipart upload');
        }

        if (!createRes.UploadId) {
          this.logger.error('no upload ID returned while initiating multipart upload');
          throw new Error('Failed to initiate multipart upload');
        }

        uploadId = createRes.UploadId;
      } catch (e) {
        this.logger.error('there was an error while initiating multipart upload');
        this.logger.error('error metadata', e as Record<string, unknown>);

        throw new Error('Failed to initiate multipart upload');
      }

      const partSize = 5 * 1024 * 1024;
      const eTags = [];

      for (let start = 0, part = 1; start < size; start += partSize, part++) {
        const end = Math.min(start + partSize - 1, size - 1);

        const uploadPartCopyCommand = new UploadPartCopyCommand({
          Bucket: this.options.bucket,
          Key: this.key(to),
          CopySource: this.options.bucket + '/' + this.key(from),
          CopySourceRange: `bytes=${start}-${end}`,
          PartNumber: part,
          UploadId: uploadId,
        });

        try {
          const copyRes = await this.client.send(uploadPartCopyCommand);
          if (!isOk(copyRes.$metadata.httpStatusCode || 0)) {
            this.logger.error('there was an error while copying part of the object');
            this.logger.error('error metadata', copyRes.$metadata as Record<string, unknown>);
            throw new Error('Failed to copy part of the object');
          }

          eTags.push({ ETag: copyRes.CopyPartResult?.ETag, PartNumber: part });
        } catch (e) {
          this.logger.error('there was an error while renaming object using multipart copy');
          this.logger.error('error metadata', e as Record<string, unknown>);

          throw new Error('Failed to rename object using multipart copy');
        }
      }

      const completeMultipartUploadCommand = new CompleteMultipartUploadCommand({
        Bucket: this.options.bucket,
        Key: this.key(to),
        UploadId: uploadId,
        MultipartUpload: {
          Parts: eTags,
        },
      });

      try {
        const completeRes = await this.client.send(completeMultipartUploadCommand);
        if (!isOk(completeRes.$metadata.httpStatusCode || 0)) {
          this.logger.error('there was an error while completing multipart upload');
          this.logger.error('error metadata', completeRes.$metadata as Record<string, unknown>);
          throw new Error('Failed to complete multipart upload');
        }
      } catch (e) {
        this.logger.error('there was an error while completing multipart upload');
        this.logger.error('error metadata', e as Record<string, unknown>);

        throw new Error('Failed to complete multipart upload');
      }

      return;
    }

    const copyCommand = new CopyObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(to),
      CopySource: this.options.bucket + '/' + this.key(from),
    });

    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(from),
    });

    try {
      const copyRes = await this.client.send(copyCommand);
      if (!isOk(copyRes.$metadata.httpStatusCode || 0)) {
        this.logger.error('there was an error while copying object');
        this.logger.error('error metadata', copyRes.$metadata as Record<string, unknown>);
        throw new Error('Failed to copy object');
      }

      const deleteRes = await this.client.send(deleteCommand);
      if (!isOk(deleteRes.$metadata.httpStatusCode || 0)) {
        this.logger.error('there was an error while deleting old object');
        this.logger.error('error metadata', deleteRes.$metadata as Record<string, unknown>);
        throw new Error('Failed to delete old object');
      }
    } catch (e) {
      this.logger.error('there was an error while renaming object');
      this.logger.error('error metadata', e as Record<string, unknown>);

      throw new Error('Failed to rename object');
    }
  }

  public async list(options: ListOptions = { prefix: '' }): Promise<string[]> {
    const command = new ListObjectsCommand({
      Bucket: this.options.bucket,
      Prefix: this.key(options.prefix || ''),
      Delimiter: this.options.subdirectory ? undefined : '/',
    });

    try {
      const res = await this.client.send(command);

      if (!isOk(res.$metadata.httpStatusCode || 0)) {
        this.logger.error('there was an error while listing objects');
        this.logger.error('error metadata', res.$metadata as Record<string, unknown>);

        return [];
      }

      return (
        res.Contents?.map((obj) => {
          if (this.options.subdirectory) {
            return obj.Key!.replace(this.options.subdirectory + '/', '');
          }
          return obj.Key!;
        }) ?? []
      );
    } catch (e) {
      this.logger.error('there was an error while listing objects');
      this.logger.error('error metadata', e as Record<string, unknown>);

      return [];
    }
  }
}
