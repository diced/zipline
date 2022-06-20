import { Datasource } from './';
import AWS from 'aws-sdk';
import { Readable } from 'stream';
import { ConfigS3Datasource } from 'lib/types';

export class S3 extends Datasource {
  public name: string = 'S3';
  public s3: AWS.S3;

  public constructor(
    public config: ConfigS3Datasource,
  ) {
    super();
    this.s3 = new AWS.S3({
      accessKeyId: config.access_key_id,
      endpoint: config.endpoint || null,
      s3ForcePathStyle: config.force_s3_path,
      secretAccessKey: config.secret_access_key,
    });
  }

  public async save(file: string, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.s3.upload({
        Bucket: this.config.bucket,
        Key: file,
        Body: data,
      }, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async delete(file: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.s3.deleteObject({
        Bucket: this.config.bucket,
        Key: file,
      }, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public get(file: string): Readable {
    // Unfortunately, aws-sdk is bad and the stream still loads everything into memory.
    return this.s3.getObject({
      Bucket: this.config.bucket,
      Key: file,
    }).createReadStream();
  }

  public async size(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.s3.listObjects({
        Bucket: this.config.bucket,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const size = data.Contents.reduce((acc, cur) => acc + cur.Size, 0);
          resolve(size);
        }
      });
    });
  }
}