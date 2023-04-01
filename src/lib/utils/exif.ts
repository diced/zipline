import { File } from '@prisma/client';
import { createWriteStream } from 'fs';
import { ExifTool, Tags } from 'exiftool-vendored';
import datasource from 'lib/datasource';
import Logger from 'lib/logger';
import { join } from 'path';
import { readFile, unlink } from 'fs/promises';

const logger = Logger.get('exif');

export async function readMetadata(filePath: string): Promise<Tags> {
  const exiftool = new ExifTool({ cleanupChildProcs: false });

  const exif = await exiftool.read(filePath);
  logger.debug(`exif(${filePath}) -> ${JSON.stringify(exif)}`);

  for (const key in exif) {
    if (exif[key]?.rawValue) {
      exif[key] = exif[key].rawValue;
    }
  }

  delete exif.Directory;
  delete exif.Source;
  delete exif.SourceFile;
  delete exif.errors;
  delete exif.Warning;

  await exiftool.end(true);

  return exif;
}

export async function removeGPSData(image: File): Promise<void> {
  const exiftool = new ExifTool({ cleanupChildProcs: false });
  const file = join(config.core.temp_directory, `zipline-exif-remove-${Date.now()}-${image.name}`);
  logger.debug(`writing temp file to remove GPS data: ${file}`);

  const stream = await datasource.get(image.name);
  const writeStream = createWriteStream(file);
  stream.pipe(writeStream);

  await new Promise((resolve) => writeStream.on('finish', resolve));

  logger.debug(`removing GPS data from ${file}`);
  await exiftool.write(file, {
    GPSVersionID: null,
    GPSAltitude: null,
    GPSAltitudeRef: null,
    GPSAreaInformation: null,
    GPSDateStamp: null,
    GPSDateTime: null,
    GPSDestBearing: null,
    GPSDestBearingRef: null,
    GPSDestDistance: null,
    GPSDestLatitude: null,
    GPSDestLatitudeRef: null,
    GPSDestLongitude: null,
    GPSDestLongitudeRef: null,
    GPSDifferential: null,
    GPSDOP: null,
    GPSHPositioningError: null,
    GPSImgDirection: null,
    GPSImgDirectionRef: null,
    GPSLatitude: null,
    GPSLatitudeRef: null,
    GPSLongitude: null,
    GPSLongitudeRef: null,
    GPSMapDatum: null,
    GPSPosition: null,
    GPSProcessingMethod: null,
    GPSSatellites: null,
    GPSSpeed: null,
    GPSSpeedRef: null,
    GPSStatus: null,
    GPSTimeStamp: null,
    GPSTrack: null,
    GPSTrackRef: null,
  });

  logger.debug(`reading file to upload to datasource: ${file} -> ${image.name}`);
  const buffer = await readFile(file);
  await datasource.save(image.name, buffer);

  logger.debug(`removing temp file: ${file}`);
  await unlink(file);

  await exiftool.end(true);

  return;
}
