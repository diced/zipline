import bytesFn, { BytesOptions } from 'bytes';

export function bytes(value: number, options: BytesOptions = { unitSeparator: ' ' }): string {
  return bytesFn(value, options);
}
