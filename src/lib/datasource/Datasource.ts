import { Readable } from 'stream';

export abstract class Datasource {
  public name: string | undefined;

  public abstract get(file: string): null | Readable | Promise<Readable | null>;
  public abstract put(file: string, data: Buffer): Promise<void>;
  public abstract delete(file: string): Promise<void>;
  public abstract size(file: string): Promise<number>;
  public abstract totalSize(): Promise<number>;
  public abstract clear(): Promise<void>;
  public abstract range(file: string, start: number, end: number): Promise<Readable>;
}
