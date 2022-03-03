import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { Datasource } from './datasource';

export class Local extends Datasource {
  public name: string = 'local';

  public constructor(public path: string) {
    super();
  }

  public async save(file: string, data: Buffer): Promise<void> {
    await writeFile(join(process.cwd(), this.path, file), data);
  }

  public async get(file: string): Promise<Buffer> {
    try {
      const data = await readFile(join(process.cwd(), this.path, file));
      return data;
    } catch (e) {
      return null;
    }
  }

  public async size(): Promise<number> {
    const files = await readdir(this.path);
  
    let size = 0;
    for (let i = 0, L = files.length; i !== L; ++i) {
      const sta = await stat(join(this.path, files[i]));
      size += sta.size;
    }
  
    return size;
  }
}