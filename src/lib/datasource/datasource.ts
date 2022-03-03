export abstract class Datasource {
  public name: string;
  
  public abstract save(file: string, data: Buffer): Promise<void>;
  public abstract get(file: string): Promise<Buffer>;
  public abstract size(): Promise<number>;
}