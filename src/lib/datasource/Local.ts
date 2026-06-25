import { createReadStream, existsSync } from 'fs';
import { access, constants, copyFile, readdir, rename, rm, stat, writeFile } from 'fs/promises';
import { join, resolve, sep } from 'path';
import { Readable } from 'stream';
import { Datasource, ListOptions, PutOptions } from './Datasource';
import { log } from '../logger';

async function existsAndCanRW(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK | constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function isCrossDeviceMove(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EXDEV';
}

export class LocalDatasource extends Datasource {
  name = 'local';
  logger = log('datasource').c('local');

  constructor(public dir: string) {
    super();
  }

  private resolvePath(file: string): string | void {
    const resolved = resolve(this.dir, file);
    const uploadsDir = resolve(this.dir);

    if (!resolved.startsWith(uploadsDir + sep)) return;

    return resolved;
  }

  public get(file: string): Readable | null {
    const path = this.resolvePath(file);
    if (!path) return null;
    if (!existsSync(path)) return null;

    const readStream = createReadStream(path);
    return readStream;
  }

  public async put(file: string, data: Buffer | string, { noDelete }: PutOptions): Promise<void> {
    const path = this.resolvePath(file);
    if (!path) throw new Error('Invalid path provided');

    // handles path-based writes without duplicating bytes when the source can be consumed
    if (typeof data === 'string' && data.startsWith('/')) {
      const exists = await existsAndCanRW(data);
      if (!exists)
        throw new Error(
          "Something went very wrong! the temporary directory wasn't readable or the file doesn't exist.",
        );

      if (!noDelete) {
        try {
          await rename(data, path);
          return;
        } catch (e) {
          if (!isCrossDeviceMove(e)) throw e;
        }
      }

      await copyFile(data, path);

      if (!noDelete) await rm(data);

      return;
    }

    return writeFile(path, data);
  }

  public async delete(file: string | string[]): Promise<void> {
    if (Array.isArray(file)) {
      await Promise.all(file.map((f) => this.delete(f)));

      return;
    }

    const path = this.resolvePath(file);
    if (!path) throw new Error('Invalid path provided');

    if (!existsSync(path)) return Promise.resolve();

    return rm(path);
  }

  public async size(file: string): Promise<number> {
    const path = this.resolvePath(file);
    if (!path) throw new Error('Invalid path provided');
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
    const path = this.resolvePath(file);
    if (!path) throw new Error('Invalid path provided');

    const readStream = createReadStream(path, { start, end });

    return readStream;
  }

  public async rename(from: string, to: string): Promise<void> {
    const fromPath = this.resolvePath(from);
    const toPath = this.resolvePath(to);
    if (!fromPath || !toPath) throw new Error('Invalid path provided');

    if (!existsSync(fromPath))
      throw new Error(`Something went very wrong! File ${from} does not exist in local datasource.`);

    return rename(fromPath, toPath);
  }

  public async list(options: ListOptions = { prefix: '' }): Promise<string[]> {
    const files = await readdir(this.dir, { withFileTypes: true });

    return files.filter((f) => f.isFile() && f.name.startsWith(options.prefix || '')).map((f) => f.name);
  }
}
