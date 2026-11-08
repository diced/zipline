import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
  UploadPartCopyCommand,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
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

function isMissingObject(error: unknown) {
  return error instanceof NoSuchKey || error instanceof NotFound;
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
      if (!isOk(writeRes.$metadata.httpStatusCode || 0))
        throw new Error(
          `S3 access test write failed with status ${writeRes.$metadata.httpStatusCode ?? 'unknown'}`,
        );

      const readRes = await this.client.send(readObject);
      await readRes.Body?.transformToWebStream().cancel();
      if (!isOk(readRes.$metadata.httpStatusCode || 0))
        throw new Error(
          `S3 access test read failed with status ${readRes.$metadata.httpStatusCode ?? 'unknown'}`,
        );
      if (!readRes.Body) throw new Error('S3 access test read returned no body');

      const deleteRes = await this.client.send(deleteObject);
      if (!isOk(deleteRes.$metadata.httpStatusCode || 0))
        throw new Error(
          `S3 access test delete failed with status ${deleteRes.$metadata.httpStatusCode ?? 'unknown'}`,
        );

      this.logger.debug('access test successful');
      this.logger.debug(`able to read/write bucket ${this.options.bucket}`);
    } catch (e) {
      this.logger
        .error('there was an error while testing access', {
          error: e instanceof Error ? e.message : e,
        })
        .error('zipline will now exit');
      process.exit(1);
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
        await res.Body?.transformToWebStream().cancel();
        throw new Error(`S3 get failed with status ${res.$metadata.httpStatusCode ?? 'unknown'}`);
      }
      if (!res.Body) throw new Error('S3 get returned no body');

      return Readable.fromWeb(res.Body.transformToWebStream() as ReadableStream<any>);
    } catch (e) {
      if (isMissingObject(e)) return null;

      this.logger.error('there was an error while getting object', {
        error: e instanceof Error ? e.message : e,
      });
      throw e;
    }
  }

  public async put(file: string, data: Buffer | string, options: PutOptions = {}): Promise<void> {
    try {
      if (typeof data === 'string') {
        const size = await stat(data).then((file) => file.size);
        if (size > 25 * 1024 * 1024) {
          // 25mb
          this.logger.debug('putting object with multipart upload', { file, key: this.key(file) });

          try {
            const upload = new Upload({
              client: this.client,
              params: {
                Bucket: this.options.bucket,
                Key: this.key(file),
                Body: createReadStream(data),
                ...(options.mimetype ? { ContentType: options.mimetype } : {}),
              },
              leavePartsOnError: false,
            });

            await upload.done();
            return;
          } catch (error) {
            this.logger.warn('multipart upload failed, retrying with a single request', {
              error: error instanceof Error ? error.message : error,
            });
          }
        }
      }

      const command = new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: this.key(file),
        Body: typeof data === 'string' ? createReadStream(data) : data,
        ...(options.mimetype ? { ContentType: options.mimetype } : {}),
      });
      const res = await this.client.send(command);

      if (!isOk(res.$metadata.httpStatusCode || 0))
        throw new Error(`S3 put failed with status ${res.$metadata.httpStatusCode ?? 'unknown'}`);
    } catch (e) {
      this.logger.error('there was an error while putting object', {
        error: e instanceof Error ? e.message : e,
      });
      throw e;
    }
  }

  public async delete(file: string | string[]): Promise<void> {
    let command: DeleteObjectCommand | DeleteObjectsCommand;

    if (Array.isArray(file)) {
      if (!file.length) return;

      if (file.length > 1000) {
        for (let i = 0; i < file.length; i += 1000) await this.delete(file.slice(i, i + 1000));
        return;
      }

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

      if (!isOk(res.$metadata.httpStatusCode || 0))
        throw new Error(`S3 delete failed with status ${res.$metadata.httpStatusCode ?? 'unknown'}`);

      if ('Errors' in res && res.Errors?.length) {
        const errors = res.Errors.map(
          (error) => `${error.Key}: ${error.Code} (${error.Message ?? 'unknown error'})`,
        );
        throw new Error(`S3 delete failed: ${errors.join(', ')}`);
      }
    } catch (e) {
      if (!Array.isArray(file) && isMissingObject(e)) return;

      this.logger.error('there was an error while deleting object', {
        error: e instanceof Error ? e.message : e,
      });
      throw e;
    }
  }

  public async size(file: string): Promise<number> {
    const command = new HeadObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(file),
    });

    try {
      const res = await this.client.send(command);

      if (!isOk(res.$metadata.httpStatusCode || 0))
        throw new Error(`S3 size failed with status ${res.$metadata.httpStatusCode ?? 'unknown'}`);
      if (
        typeof res.ContentLength !== 'number' ||
        !Number.isSafeInteger(res.ContentLength) ||
        res.ContentLength < 0
      )
        throw new Error('S3 size returned an invalid content length');

      return res.ContentLength;
    } catch (e) {
      if (isMissingObject(e)) return 0;

      this.logger.error('there was an error while getting object size', {
        error: e instanceof Error ? e.message : e,
      });
      throw e;
    }
  }

  public async totalSize(): Promise<number> {
    let total = 0;

    for await (const objects of this.listObjects()) {
      for (const obj of objects) {
        if (typeof obj.Size !== 'number' || !Number.isSafeInteger(obj.Size) || obj.Size < 0)
          throw new Error('S3 list returned an invalid object size');

        total += obj.Size;
      }
    }

    return total;
  }

  public async clear(): Promise<void> {
    await this.delete(await this.list());
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
        await res.Body?.transformToWebStream().cancel();
        throw new Error(`S3 range failed with status ${res.$metadata.httpStatusCode ?? 'unknown'}`);
      }
      if (!res.Body) throw new Error('S3 range returned no body');

      return Readable.fromWeb(res.Body.transformToWebStream() as ReadableStream<any>);
    } catch (e) {
      this.logger.error('there was an error while getting object range', {
        error: e instanceof Error ? e.message : e,
      });
      throw e;
    }
  }

  public async rename(from: string, to: string): Promise<void> {
    try {
      if (from === to) {
        const res = await this.client.send(
          new HeadObjectCommand({ Bucket: this.options.bucket, Key: this.key(from) }),
        );
        if (!isOk(res.$metadata.httpStatusCode || 0))
          throw new Error(`S3 rename failed with status ${res.$metadata.httpStatusCode ?? 'unknown'}`);
        return;
      }

      const size = await this.size(from);
      const copySource = `${this.options.bucket}/${this.key(from)}`
        .split('/')
        .map(encodeURIComponent)
        .join('/');

      if (size > 5 * 1024 * 1024 * 1024) {
        this.logger.debug('object larger than 5GB, using multipart copy for rename', { from, to, size });

        let uploadId: string | undefined;
        try {
          const createRes = await this.client.send(
            new CreateMultipartUploadCommand({
              Bucket: this.options.bucket,
              Key: this.key(to),
            }),
          );
          uploadId = createRes.UploadId;
          if (!isOk(createRes.$metadata.httpStatusCode || 0))
            throw new Error(
              `S3 multipart copy creation failed with status ${createRes.$metadata.httpStatusCode ?? 'unknown'}`,
            );
          if (!uploadId) throw new Error('S3 multipart copy returned no upload ID');

          const partSize = 5 * 1024 * 1024;
          const eTags = [];

          for (let start = 0, part = 1; start < size; start += partSize, part++) {
            const end = Math.min(start + partSize - 1, size - 1);
            const copyRes = await this.client.send(
              new UploadPartCopyCommand({
                Bucket: this.options.bucket,
                Key: this.key(to),
                CopySource: copySource,
                CopySourceRange: `bytes=${start}-${end}`,
                PartNumber: part,
                UploadId: uploadId,
              }),
            );
            if (!isOk(copyRes.$metadata.httpStatusCode || 0))
              throw new Error(
                `S3 multipart copy part failed with status ${copyRes.$metadata.httpStatusCode ?? 'unknown'}`,
              );
            if (!copyRes.CopyPartResult?.ETag) throw new Error('S3 multipart copy part returned no ETag');

            eTags.push({ ETag: copyRes.CopyPartResult.ETag, PartNumber: part });
          }

          const completeRes = await this.client.send(
            new CompleteMultipartUploadCommand({
              Bucket: this.options.bucket,
              Key: this.key(to),
              UploadId: uploadId,
              MultipartUpload: { Parts: eTags },
            }),
          );
          if (!isOk(completeRes.$metadata.httpStatusCode || 0))
            throw new Error(
              `S3 multipart copy completion failed with status ${completeRes.$metadata.httpStatusCode ?? 'unknown'}`,
            );
        } catch (e) {
          if (uploadId) {
            try {
              const abortRes = await this.client.send(
                new AbortMultipartUploadCommand({
                  Bucket: this.options.bucket,
                  Key: this.key(to),
                  UploadId: uploadId,
                }),
              );
              if (!isOk(abortRes.$metadata.httpStatusCode || 0))
                throw new Error(
                  `S3 multipart copy abort failed with status ${abortRes.$metadata.httpStatusCode ?? 'unknown'}`,
                );
            } catch (error) {
              this.logger.error('failed to abort multipart copy', {
                error: error instanceof Error ? error.message : error,
              });
            }
          }
          throw e;
        }
      } else {
        const copyRes = await this.client.send(
          new CopyObjectCommand({
            Bucket: this.options.bucket,
            Key: this.key(to),
            CopySource: copySource,
          }),
        );
        if (!isOk(copyRes.$metadata.httpStatusCode || 0))
          throw new Error(`S3 copy failed with status ${copyRes.$metadata.httpStatusCode ?? 'unknown'}`);
        if (!copyRes.CopyObjectResult?.ETag) throw new Error('S3 copy returned no ETag');
      }

      await this.delete(from);
    } catch (e) {
      this.logger.error('there was an error while renaming object', {
        error: e instanceof Error ? e.message : e,
      });
      throw e;
    }
  }

  private async *listObjects(prefix = '', delimiter?: string) {
    const storagePrefix = this.key('');
    const continuationTokens = new Set<string>();
    let continuationToken: string | undefined;

    try {
      do {
        const res = await this.client.send(
          new ListObjectsV2Command({
            Bucket: this.options.bucket,
            Prefix: this.key(prefix),
            Delimiter: delimiter,
            ContinuationToken: continuationToken,
          }),
        );

        if (!isOk(res.$metadata.httpStatusCode || 0))
          throw new Error(`S3 list failed with status ${res.$metadata.httpStatusCode ?? 'unknown'}`);

        for (const obj of res.Contents ?? [])
          if (typeof obj.Key !== 'string' || !obj.Key.startsWith(storagePrefix))
            throw new Error('S3 list returned an invalid object key');

        continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
        if (res.IsTruncated) {
          if (!continuationToken || continuationTokens.has(continuationToken))
            throw new Error('S3 list returned an invalid continuation token');

          continuationTokens.add(continuationToken);
        }

        yield res.Contents ?? [];
      } while (continuationToken);
    } catch (e) {
      this.logger.error('there was an error while listing objects', {
        error: e instanceof Error ? e.message : e,
      });
      throw e;
    }
  }

  public async list(options: ListOptions = { prefix: '' }): Promise<string[]> {
    const files: string[] = [];
    const storagePrefix = this.key('');

    for await (const objects of this.listObjects(
      options.prefix || '',
      this.options.subdirectory ? undefined : '/',
    ))
      for (const obj of objects) files.push(obj.Key!.slice(storagePrefix.length));

    return files;
  }
}
