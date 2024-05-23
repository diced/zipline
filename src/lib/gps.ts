// @ts-ignore
import * as gmr from '@xoi/gps-metadata-remover';

export const removeLocation = gmr.removeLocation as (
  photoUri: string,
  read: ReadFunction,
  write: WriteFunction,
) => Promise<boolean>;

export type ReadFunction = (size: number, offset: number) => Promise<Buffer>;
export type WriteFunction = (writeValue: string, entryOffset: number, encoding: string) => Promise<void>;

export async function removeGps(buffer: Buffer): Promise<boolean> {
  const read = (size: number, offset: number) => Promise.resolve(buffer.subarray(offset, offset + size));
  const write = (writeValue: string, entryOffset: number, encoding: string) => {
    buffer.write(writeValue, entryOffset, encoding as BufferEncoding);
    return Promise.resolve();
  };

  return removeLocation('', read, write);
}
