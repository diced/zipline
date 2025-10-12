import {
  PNG_TAG,
  PNG_IEND,
  EXIF_PNG_TAG,
  JPEG_EXIF_TAG,
  JPEG_JFIF_TAG,
  JPEG_APP1_TAG,
  EXIF_JPEG_TAG,
  TIFF_LE,
  TIFF_BE,
  GPS_IFD_TAG,
} from './constants';

function isLE(buffer: Buffer): boolean {
  return buffer.readUInt32BE(0) === TIFF_LE;
}

function removeGpsEntries(buffer: Buffer, offset: number, le: boolean): void {
  const numEntries = le ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);

  const fieldsStart = offset + 2;
  const toClear = numEntries * 12;
  const zeroBuffer = Buffer.alloc(toClear);

  zeroBuffer.copy(buffer, fieldsStart);
}

function parseExifTag(buffer: Buffer, offset: number, le: boolean) {
  const tag = le ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
  const field = le ? buffer.readUInt16LE(offset + 2) : buffer.readUInt16BE(offset + 2);
  const count = le ? buffer.readUInt32LE(offset + 4) : buffer.readUInt32BE(offset + 4);
  const valueOffset = le ? buffer.readUInt32LE(offset + 8) : buffer.readUInt32BE(offset + 8);

  return { tag, field, count, valueOffset };
}

function locateGpsTagOffset(buffer: Buffer, offset: number, le: boolean): number {
  const numEntries = le ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
  const fieldsStart = offset + 2;

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = fieldsStart + i * 12;
    const { tag, field, count, valueOffset } = parseExifTag(buffer, entryOffset, le);

    if (tag === GPS_IFD_TAG && field === 4 && count === 1) {
      return valueOffset;
    }
  }

  return -1;
}

function stripGpsFromTiff(buffer: Buffer, offset: number, le: boolean): boolean {
  const gpsDirectoryOffset = locateGpsTagOffset(buffer, offset, le);

  if (gpsDirectoryOffset >= 0) {
    removeGpsEntries(buffer, gpsDirectoryOffset, le);
    return true;
  }

  return false;
}

function stripGpsFromExif(buffer: Buffer, offset: number): boolean {
  const headerSlice = buffer.subarray(offset, offset + 8);
  const littleEndian = isLE(headerSlice);
  const gpsDirectoryOffset = locateGpsTagOffset(buffer, offset + 8, littleEndian);

  if (gpsDirectoryOffset >= 0) {
    removeGpsEntries(buffer, gpsDirectoryOffset + offset, littleEndian);
    return true;
  }

  return false;
}

export function removeGps(buffer: Buffer): boolean {
  const signature = buffer.readUInt32BE(0);
  let offset = 0;
  let removed = false;

  if (signature === PNG_TAG) {
    offset += 8;

    let chunkLength = 0;
    let chunkType = 0;
    while (chunkType !== PNG_IEND) {
      chunkLength = buffer.readUInt32BE(offset);
      chunkType = buffer.readUInt32BE(offset + 4);

      if (chunkType === EXIF_PNG_TAG) {
        const exifDataOffset = offset + 8;
        removed = stripGpsFromExif(buffer, exifDataOffset);
      }

      if (chunkType !== PNG_IEND) {
        offset += 12 + chunkLength;
      }
    }
  } else if (signature === JPEG_EXIF_TAG || signature === JPEG_JFIF_TAG) {
    offset += 4;

    if (signature === JPEG_JFIF_TAG) {
      const jfifSegmentSize = buffer.readUInt16BE(offset);
      offset += jfifSegmentSize;
      const nextMarker = buffer.readUInt16BE(offset);

      if (nextMarker === JPEG_APP1_TAG) {
        offset += 2;
      } else {
        return removed;
      }
    }

    const exifSignature = buffer.readUInt32BE(offset + 2);

    if (exifSignature === EXIF_JPEG_TAG) {
      offset += 8;
      removed = stripGpsFromExif(buffer, offset);
    }
  } else if (signature === TIFF_LE || signature === TIFF_BE) {
    const littleEndian = isLE(buffer);
    offset += 4;
    const tiffIfdOffset = littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
    removed = stripGpsFromTiff(buffer, tiffIfdOffset, littleEndian);
  }

  return removed;
}
