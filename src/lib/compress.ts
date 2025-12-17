import { extname } from 'path';
import sharp from 'sharp';
import { log } from './logger';

const logger = log('compress');

export const COMPRESS_TYPES = ['jpg', 'jpeg', 'png', 'webp', 'jxl'] as const;
export type CompressType = (typeof COMPRESS_TYPES)[number];

export type CompressResult = {
  mimetype: string;
  ext: CompressType;
  buffer: Buffer;

  failed?: boolean;
};

export type CompressOptions = {
  quality: number;
  type?: CompressType;
};

export function checkOutput(type: CompressType): boolean {
  if (type === 'jpg') type = 'jpeg';

  return !!(sharp.format as any)[type]?.output?.file && !!(sharp.format as any)[type]?.output?.buffer;
}

export async function compressFile(filePath: string, options: CompressOptions): Promise<CompressResult> {
  try {
    const { quality, type } = options;

    const animated = ['.gif', '.webp', '.avif', '.tiff'].includes(extname(filePath).toLowerCase());

    const image = sharp(filePath, { animated }).withMetadata();

    const result: CompressResult = {
      mimetype: '',
      ext: 'jpg',
      buffer: Buffer.alloc(0),
    };

    let buffer: Buffer;

    switch (type?.toLowerCase()) {
      case 'png':
        buffer = await image.png({ quality }).toBuffer();
        result.mimetype = 'image/png';
        result.ext = 'png';
        break;
      case 'webp':
        buffer = await image.webp({ quality }).toBuffer();
        result.mimetype = 'image/webp';
        result.ext = 'webp';
        break;
      case 'jxl':
        buffer = await image.jxl({ quality }).toBuffer();
        result.mimetype = 'image/jxl';
        result.ext = 'jxl';
        break;
      case 'jpg':
      case 'jpeg':
      default:
        buffer = await image.jpeg({ quality }).toBuffer();
        result.mimetype = 'image/jpeg';
        result.ext = 'jpg';
        break;
    }

    return {
      ...result,
      buffer,
    };
  } catch (error) {
    logger.error(`failed to compress file: ${error}`);

    return {
      mimetype: '',
      ext: 'jpg',
      buffer: Buffer.alloc(0),
      failed: true,
    };
  }
}
