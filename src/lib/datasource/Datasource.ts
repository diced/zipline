import { Readable } from 'stream';

export type PutOptions = { mimetype?: string; noDelete?: boolean; partSize?: number };
export type ListOptions = { prefix: string };

export abstract class Datasource {
  public name: string | undefined;

  public abstract get(file: string): null | Readable | Promise<Readable | null>;
  public abstract put(file: string, data: Buffer | string, options?: PutOptions): Promise<void>;
  public abstract delete(file: string | string[]): Promise<void>;
  public abstract size(file: string): Promise<number>;
  public abstract totalSize(): Promise<number>;
  public abstract clear(): Promise<void>;
  public abstract range(file: string, start: number, end: number): Promise<Readable>;
  public abstract rename(from: string, to: string): Promise<void>;
  public abstract list(options: ListOptions): Promise<string[]>;
}
