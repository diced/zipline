import { createReadStream, existsSync, ReadStream } from 'fs';
import { readdir, rm, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { Datasource } from '.';

export class Local extends Datasource {
  public name: string = 'local';

  public constructor(public path: string) {
    super();
  }

  public async save(file: string, data: Buffer): Promise<void> {
    await writeFile(join(process.cwd(), this.path, file), data);
  }

  public async delete(file: string): Promise<void> {
    await rm(join(process.cwd(), this.path, file));
  }

  public get(file: string): ReadStream {
    const full = join(process.cwd(), this.path, file);
    if (!existsSync(full)) return null;

    try {
      return createReadStream(full);
    } catch (e) {
      return null;
    }
  }

  public async size(file: string): Promise<number> {
    const stats = await stat(join(process.cwd(), this.path, file));

    return stats.size;
  }

  public async fullSize(): Promise<number> {
    const files = await readdir(this.path);

    let size = 0;
    for (let i = 0, L = files.length; i !== L; ++i) {
      const sta = await stat(join(this.path, files[i]));
      size += sta.size;
    }

    return size;
  }
}
