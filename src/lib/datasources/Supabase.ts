import { Datasource } from '.';
import { ConfigSupabaseDatasource } from 'lib/config/Config';
import { guess } from '../mimes';
import Logger from '../logger';
import { Readable } from 'stream';

export class Supabase extends Datasource {
  public name: string = 'Supabase';
  public logger: Logger = Logger.get('datasource::supabase');

  public constructor(public config: ConfigSupabaseDatasource) {
    super();
  }

  public async save(file: string, data: Buffer): Promise<void> {
    const mimetype = await guess(file.split('.').pop());

    const r = await fetch(`${this.config.url}/storage/v1/object/${this.config.bucket}/${file}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.key}`,
        'Content-Type': mimetype,
      },
      body: data,
    });

    const j = await r.json();
    if (j.error) this.logger.error(`${j.error}: ${j.message}`);
  }

  public async delete(file: string): Promise<void> {
    await fetch(`${this.config.url}/storage/v1/object/${this.config.bucket}/${file}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.config.key}`,
      },
    });
  }

  public async get(file: string): Promise<Readable> {
    // get a readable stream from the request
    const r = await fetch(`${this.config.url}/storage/v1/object/${this.config.bucket}/${file}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.config.key}`,
      },
    });

    return Readable.fromWeb(r.body as any);
  }

  public size(file: string): Promise<number> {
    return new Promise(async (res, rej) => {
      fetch(`${this.config.url}/storage/v1/object/list/${this.config.bucket}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix: '',
          search: file,
        }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.error) {
            this.logger.error(`${j.error}: ${j.message}`);
            res(0);
          }

          if (j.length === 0) {
            res(0);
          } else {
            res(j[0].metadata.size);
          }
        });
    });
  }

  public async fullSize(): Promise<number> {
    return new Promise((res, rej) => {
      fetch(`${this.config.url}/storage/v1/object/list/${this.config.bucket}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix: '',
        }),
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.error) {
            this.logger.error(`${j.error}: ${j.message}`);
            res(0);
          }

          res(j.reduce((a, b) => a + b.metadata.size, 0));
        });
    });
  }
}
