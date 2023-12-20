import { Datasource } from '.';
import { Readable } from 'stream';
import { ConfigS3Datasource } from 'lib/config/Config';
import { Client } from 'minio';

export class S3 extends Datasource {
  public name = 'S3';
  public s3: Client;

  public constructor(public config: ConfigS3Datasource) {
    super();
    this.s3 = new Client({
      endPoint: config.endpoint,
      accessKey: config.access_key_id,
      secretKey: config.secret_access_key,
      pathStyle: config.force_s3_path,
      port: config.port ?? undefined,
      useSSL: config.use_ssl,
      region: config.region,
    });
  }

  public async save(file: string, data: Buffer, options?: { type: string }): Promise<void> {
    await this.s3.putObject(
      this.config.bucket,
      file,
      data,
      options ? { 'Content-Type': options.type } : undefined,
    );
  }

  public async delete(file: string): Promise<void> {
    await this.s3.removeObject(this.config.bucket, file);
  }

  public async clear(): Promise<void> {
    const objects = this.s3.listObjectsV2(this.config.bucket, '', true);
    const files = [];

    objects.on('data', (item) => files.push(item.name));
    objects.on('end', async () => {
      this.s3.removeObjects(this.config.bucket, files, (err) => {
        if (err) throw err;
      });
    });
  }

  public get(file: string): Promise<Readable> {
    return new Promise((res) => {
      this.s3.getObject(this.config.bucket, file, (err, stream) => {
        if (err) res(null);
        else res(stream);
      });
    });
  }

  public async size(file: string): Promise<number> {
    const stat = await this.s3.statObject(this.config.bucket, file);

    return stat.size;
  }

  public async fullSize(): Promise<number> {
    return new Promise((res) => {
      const objects = this.s3.listObjectsV2(this.config.bucket, '', true);
      let size = 0;

      objects.on('data', (item) => (size += item.size));
      objects.on('end', (err) => {
        if (err) res(0);
        else res(size);
      });
    });
  }
}
