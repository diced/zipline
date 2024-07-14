import { createReadStream, existsSync } from 'fs';
import { readdir, rm, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { Readable } from 'stream';
import { Datasource } from './Datasource';

export class LocalDatasource extends Datasource {
  name = 'local';

  constructor(public dir: string) {
    super();
  }

  public get(file: string): Readable | null {
    const path = join(this.dir, file);
    if (!existsSync(path)) return null;

    const readStream = createReadStream(path);

    return readStream;
  }

  public async put(file: string, data: Buffer): Promise<void> {
    return writeFile(join(this.dir, file), data);
  }

  public async delete(file: string): Promise<void> {
    const path = join(this.dir, file);
    if (!existsSync(path)) return Promise.resolve();

    return rm(path);
  }

  public async size(file: string): Promise<number> {
    const path = join(this.dir, file);
    if (!existsSync(path)) return 0;

    const { size } = await stat(path);

    return size;
  }

  public async totalSize(): Promise<number> {
    const files = await readdir(this.dir);
    const sizes = await Promise.all(files.map((file) => this.size(file)));

    return sizes.reduce((a, b) => a + b, 0);
  }

  public async clear(): Promise<void> {
    for (const file of await readdir(this.dir)) {
      await rm(join(this.dir, file));
    }
  }

  public async range(file: string, start: number, end: number): Promise<Readable> {
    const path = join(this.dir, file);
    const readStream = createReadStream(path, { start, end });

    return readStream;
  }
}
