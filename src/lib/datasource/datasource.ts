import { Readable } from 'stream';

export abstract class Datasource {
  public name: string;
  
  public abstract save(file: string, data: Buffer): Promise<void>;
  public abstract delete(file: string): Promise<void>;
  public abstract get(file: string): Readable | Promise<Readable>;
  public abstract size(): Promise<number>;
}