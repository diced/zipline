// heavily modified from @xoi/gps-metadata-remover to fit the needs of zipline

import { readFileSync, writeFileSync } from 'fs';
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

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function checkRange(buffer: Buffer, offset: number, length: number): void {
  if (offset < 0 || length < 0 || offset + length > buffer.length) throw new Error('Invalid Exif data range');
}

function directoryEnd(buffer: Buffer, offset: number, le: boolean): number {
  if (offset < 8) throw new Error('Invalid Exif directory offset');
  checkRange(buffer, offset, 2);
  const numEntries = le ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
  const length = 2 + numEntries * 12 + 4;
  checkRange(buffer, offset, length);
  return offset + length;
}

function removeGpsEntries(buffer: Buffer, offset: number, le: boolean, ifdOffset: number): void {
  const end = directoryEnd(buffer, offset, le);
  const ifdEnd = directoryEnd(buffer, ifdOffset, le);
  if (offset < ifdEnd && end > ifdOffset) throw new Error('Overlapping Exif directories');

  const fieldSizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
  const ranges: [number, number][] = [];

  for (let entryOffset = offset + 2; entryOffset < end - 4; entryOffset += 12) {
    const { tag, field, count, valueOffset } = parseExifTag(buffer, entryOffset, le);
    if (tag === 0 && field === 0 && count === 0 && valueOffset === 0) continue;

    const fieldSize = fieldSizes[field];
    if (!fieldSize || count === 0) throw new Error('Invalid GPS field type or count');
    const length = fieldSize * count;
    if (length <= 4) continue;

    checkRange(buffer, valueOffset, length);
    const valueEnd = valueOffset + length;
    if (
      valueOffset < 8 ||
      (valueOffset < end && valueEnd > offset) ||
      (valueOffset < ifdEnd && valueEnd > ifdOffset)
    )
      throw new Error('GPS value overlaps an Exif header or directory');

    ranges.push([valueOffset, valueEnd]);
  }

  for (const [start, end] of ranges) buffer.fill(0, start, end);
  buffer.fill(0, offset + 2, end - 4);
}

function parseExifTag(buffer: Buffer, offset: number, le: boolean) {
  const tag = le ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
  const field = le ? buffer.readUInt16LE(offset + 2) : buffer.readUInt16BE(offset + 2);
  const count = le ? buffer.readUInt32LE(offset + 4) : buffer.readUInt32BE(offset + 4);
  const valueOffset = le ? buffer.readUInt32LE(offset + 8) : buffer.readUInt32BE(offset + 8);

  return { tag, field, count, valueOffset };
}

function locateGpsTagOffset(buffer: Buffer, offset: number, le: boolean): number {
  directoryEnd(buffer, offset, le);
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
    removeGpsEntries(buffer, gpsDirectoryOffset, le, offset);
    return true;
  }

  return false;
}

function stripGpsFromExif(buffer: Buffer): boolean {
  checkRange(buffer, 0, 8);
  const signature = buffer.readUInt32BE(0);
  if (signature !== TIFF_LE && signature !== TIFF_BE) throw new Error('Invalid Exif TIFF header');
  const littleEndian = isLE(buffer);
  const offset = littleEndian ? buffer.readUInt32LE(4) : buffer.readUInt32BE(4);
  return stripGpsFromTiff(buffer, offset, littleEndian);
}

type HeicBox = { type: string; start: number; end: number };
type HeicExtent = { id: number; start: number; end: number };

function createHeicReader(buffer: Buffer, start: number, end: number) {
  let offset = start;
  return (size: number): number => {
    if (size < 0 || size > 8 || offset + size > end) throw new Error('Invalid HEIC field bounds');
    let value = 0;
    for (let i = 0; i < size; i++) value = value * 256 + buffer[offset++];
    if (!Number.isSafeInteger(value)) throw new Error('HEIC offset exceeds safe integer range');
    return value;
  };
}

function readHeicBoxes(buffer: Buffer, start = 0, end = buffer.length): HeicBox[] {
  const result: HeicBox[] = [];
  while (start < end) {
    const read = createHeicReader(buffer, start, end);
    let size = read(4);
    read(4);
    const type = buffer.toString('ascii', start + 4, start + 8);
    const headerSize = size === 1 ? 16 : 8;
    if (size === 1) size = read(8);
    else if (size === 0) size = end - start;
    if (size < headerSize || size > end - start) throw new Error('Invalid HEIC box size');
    result.push({ type, start: start + headerSize, end: start + size });
    start += size;
  }
  return result;
}

function getHeicBox(boxes: HeicBox[], type: string): HeicBox {
  const matches = boxes.filter((box) => box.type === type);
  if (matches.length !== 1) throw new Error(`Expected one HEIC ${type} box`);
  return matches[0];
}

function readHeicItems(buffer: Buffer, iinf: HeicBox): Map<number, boolean> {
  const readInfo = createHeicReader(buffer, iinf.start, iinf.end);
  const infoVersion = readInfo(1);
  readInfo(3);

  const countSize = infoVersion === 0 ? 2 : 4;
  const itemCount = readInfo(countSize);
  const entries = readHeicBoxes(buffer, iinf.start + 4 + countSize, iinf.end);
  if (entries.length !== itemCount) throw new Error('Invalid HEIC item count');

  const items = new Map<number, boolean>();
  for (const entry of entries) {
    if (entry.type !== 'infe') throw new Error('Invalid HEIC item information entry');

    const read = createHeicReader(buffer, entry.start, entry.end);
    const version = read(1);
    read(3);

    if (version !== 2 && version !== 3) throw new Error('Unsupported HEIC item information version');

    const id = read(version === 2 ? 2 : 4);
    if (items.has(id)) throw new Error('Duplicate HEIC item');

    const protection = read(2);
    const isExif = read(4) === 0x45786966;

    if (isExif && protection) throw new Error('Encrypted HEIC Exif metadata is not supported');
    items.set(id, isExif);
  }
  return items;
}

function stripGpsFromHeic(buffer: Buffer): boolean {
  const top = readHeicBoxes(buffer);
  const ftyp = top.find((box) => box.type === 'ftyp');
  if (!ftyp || ftyp.end - ftyp.start < 8) throw new Error('Invalid HEIC file type');

  const brands = [buffer.toString('ascii', ftyp.start, ftyp.start + 4)];

  for (let offset = ftyp.start + 8; offset + 4 <= ftyp.end; offset += 4)
    brands.push(buffer.toString('ascii', offset, offset + 4));
  if (
    !brands.some((brand) => ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'].includes(brand))
  )
    return false;

  const meta = getHeicBox(top, 'meta');
  if (createHeicReader(buffer, meta.start, meta.end)(4) !== 0)
    throw new Error('Unsupported HEIC metadata version');

  const children = readHeicBoxes(buffer, meta.start + 4, meta.end);
  const iinf = getHeicBox(children, 'iinf');
  const items = readHeicItems(buffer, iinf);
  const exifIds = [...items.keys()].filter((id) => items.get(id));
  if (!exifIds.length) return false;

  const iloc = getHeicBox(children, 'iloc');
  const idats = children.filter((box) => box.type === 'idat');
  if (idats.length > 1) throw new Error('Duplicate HEIC item data box');

  const read = createHeicReader(buffer, iloc.start, iloc.end);
  const version = read(1);

  read(3);
  if (version > 2) throw new Error('Unsupported HEIC item location version');

  const sizes = read(2);
  const offsetSize = sizes >>> 12;
  const lengthSize = (sizes >>> 8) & 15;
  const baseSize = (sizes >>> 4) & 15;
  const indexSize = version > 0 ? sizes & 15 : 0;
  if ([offsetSize, lengthSize, baseSize, indexSize].some((size) => ![0, 4, 8].includes(size)))
    throw new Error('Unsupported HEIC item location field size');

  const count = read(version < 2 ? 2 : 4);
  const locations = new Map<number, HeicExtent[]>();
  const mdats = top.filter((box) => box.type === 'mdat');

  for (let i = 0; i < count; i++) {
    const id = read(version < 2 ? 2 : 4);
    if (locations.has(id) || !items.has(id)) throw new Error('Invalid HEIC item location ID');

    const method = version > 0 ? read(2) & 15 : 0;
    const reference = read(2);
    if (reference || method > 1) throw new Error('Unsupported HEIC item storage method');

    const containers = method === 1 ? idats : mdats;
    if (method === 1 && !idats.length) throw new Error('Missing HEIC item data');

    const base = read(baseSize) + (method === 1 ? idats[0].start : 0);
    const extentCount = read(2);
    const itemExtents: HeicExtent[] = [];

    for (let j = 0; j < extentCount; j++) {
      read(indexSize);
      const start = base + read(offsetSize);
      const end = start + read(lengthSize);
      if (!containers.some((box) => start >= box.start && end <= box.end))
        throw new Error('HEIC item lies outside its data box');
      if (end === start) continue;
      const extent = { id, start, end };
      itemExtents.push(extent);
    }
    locations.set(id, itemExtents);
  }

  const extents = [...locations.values()].flat().sort((a, b) => a.start - b.start);

  let lastEnd = 0;
  let lastExifEnd = 0;
  for (const extent of extents) {
    const isExif = items.get(extent.id);
    if (extent.start < (isExif ? lastEnd : lastExifEnd)) throw new Error('Overlapping HEIC Exif data');
    lastEnd = Math.max(lastEnd, extent.end);
    if (isExif) lastExifEnd = extent.end;
  }

  const updates: { data: Buffer; extents: HeicExtent[] }[] = [];
  for (const id of exifIds) {
    const itemExtents = locations.get(id);
    if (!itemExtents?.length) throw new Error('Missing HEIC Exif data');
    const data = Buffer.concat(itemExtents.map(({ start, end }) => buffer.subarray(start, end)));
    const tiffOffset = 4 + createHeicReader(data, 0, data.length)(4);
    if (tiffOffset > data.length - 8) throw new Error('Invalid HEIC Exif offset');
    if (stripGpsFromExif(data.subarray(tiffOffset))) updates.push({ data, extents: itemExtents });
  }

  for (const { data, extents } of updates) {
    let offset = 0;
    for (const { start, end } of extents) {
      const length = end - start;
      data.copy(buffer, start, offset, offset + length);
      offset += length;
    }
  }
  return updates.length > 0;
}

export function removeGps(input: Buffer | string): boolean {
  let buffer: Buffer;

  if (typeof input === 'string') {
    buffer = readFileSync(input);
  } else {
    buffer = input;
  }

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
      checkRange(buffer, offset, 12 + chunkLength);

      if (chunkType === EXIF_PNG_TAG) {
        const exifDataOffset = offset + 8;
        const chunkEnd = exifDataOffset + chunkLength;
        if (stripGpsFromExif(buffer.subarray(exifDataOffset, chunkEnd))) {
          buffer.writeUInt32BE(crc32(buffer.subarray(offset + 4, chunkEnd)), chunkEnd);
          removed = true;
        }
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
      const segmentLength = buffer.readUInt16BE(offset);
      if (segmentLength < 16) throw new Error('Invalid Exif segment length');
      checkRange(buffer, offset, segmentLength);
      const segmentEnd = offset + segmentLength;
      offset += 8;
      removed = stripGpsFromExif(buffer.subarray(offset, segmentEnd));
    }
  } else if (signature === TIFF_LE || signature === TIFF_BE) {
    const littleEndian = isLE(buffer);
    offset += 4;
    const tiffIfdOffset = littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
    removed = stripGpsFromTiff(buffer, tiffIfdOffset, littleEndian);
  } else if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    removed = stripGpsFromHeic(buffer);
  }

  if (removed && typeof input === 'string') {
    writeFileSync(input, buffer);
  }

  return removed;
}
