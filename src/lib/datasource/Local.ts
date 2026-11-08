import { createReadStream, openSync } from 'fs';
import { copyFile, readdir, rename, rm, stat, writeFile } from 'fs/promises';
import { resolve, sep } from 'path';
import { Readable } from 'stream';
import { Datasource, ListOptions, PutOptions } from './Datasource';
import { log } from '../logger';

function isFsError(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
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

    try {
      return createReadStream(path, { fd: openSync(path, 'r') });
    } catch (e) {
      if (isFsError(e, 'ENOENT')) return null;
      throw e;
    }
  }

  public async put(file: string, data: Buffer | string, { noDelete }: PutOptions = {}): Promise<void> {
    const path = this.resolvePath(file);
    if (!path) throw new Error('Invalid path provided');

    // handles path-based writes without duplicating bytes when the source can be consumed
    if (typeof data === 'string') {
      if (!noDelete) {
        try {
          await rename(data, path);
          return;
        } catch (e) {
          if (!isFsError(e, 'EXDEV')) throw e;
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

    return rm(path, { force: true });
  }

  public async size(file: string): Promise<number> {
    const path = this.resolvePath(file);
    if (!path) throw new Error('Invalid path provided');

    try {
      const { size } = await stat(path);
      return size;
    } catch (e) {
      if (isFsError(e, 'ENOENT')) return 0;
      throw e;
    }
  }

  public async totalSize(): Promise<number> {
    const files = (await readdir(this.dir, { withFileTypes: true })).filter((file) => file.isFile());
    const sizes = await Promise.all(files.map((file) => this.size(file.name)));

    return sizes.reduce((a, b) => a + b, 0);
  }

  public async clear(): Promise<void> {
    for (const file of await readdir(this.dir, { withFileTypes: true })) {
      if (file.isFile()) await this.delete(file.name);
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

    return rename(fromPath, toPath);
  }

  public async list(options: ListOptions = { prefix: '' }): Promise<string[]> {
    const files = await readdir(this.dir, { withFileTypes: true });

    return files.filter((f) => f.isFile() && f.name.startsWith(options.prefix || '')).map((f) => f.name);
  }
}
