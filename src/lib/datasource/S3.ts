import { Datasource } from './datasource';
import AWS from 'aws-sdk';
import { Readable } from 'stream';

export class S3 extends Datasource {
  public name: string = 'S3';
  public s3: AWS.S3;

  public constructor(
    public accessKey: string,
    public secretKey: string,
    public bucket: string,
  ) {
    super();
    this.s3 = new AWS.S3({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    });
  }

  public async save(file: string, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.s3.upload({
        Bucket: this.bucket,
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
        Bucket: this.bucket,
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
      Bucket: this.bucket,
      Key: file,
    }).createReadStream();
  }

  public async size(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.s3.listObjects({
        Bucket: this.bucket,
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