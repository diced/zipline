import sharp from 'sharp';

export function compress(buffer: Buffer, qualty: number) {
  return sharp(buffer).withMetadata().jpeg({ quality: qualty }).toBuffer();
}

export function replaceFileNameJpg(original: string, when?: boolean) {
  return when ? original.replace(/\.[a-zA-Z0-9]+$/, '.jpg') : original;
}
