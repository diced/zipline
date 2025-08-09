import { createReadStream, existsSync } from 'fs';
import { access, constants, copyFile, readdir, rename, rm, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { Readable } from 'stream';
import { Datasource } from './Datasource';

async function existsAndCanRW(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK | constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

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

  public async put(file: string, data: Buffer | string): Promise<void> {
    const path = join(this.dir, file);

    // handles if given a path to a file, it will just move it instead of doing unecessary writes
    if (typeof data === 'string' && data.startsWith('/')) {
      const exists = await existsAndCanRW(data);
      if (!exists)
        throw new Error(
          "Something went very wrong! the temporary directory wasn't readable or the file doesn't exist.",
        );

      await copyFile(data, path);
      await rm(data);

      return;
    }

    return writeFile(path, data);
  }

  public async delete(file: string | string[]): Promise<void> {
    if (Array.isArray(file)) {
      await Promise.all(file.map((f) => this.delete(f)));

      return;
    }

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

  public async rename(from: string, to: string): Promise<void> {
    const fromPath = join(this.dir, from);
    const toPath = join(this.dir, to);

    if (!existsSync(fromPath))
      throw new Error(`Something went very wrong! File ${from} does not exist in local datasource.`);

    return rename(fromPath, toPath);
  }
}
