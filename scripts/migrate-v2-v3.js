const { readdir } = require('fs/promises');
const { extname } = require('path');
const validateConfig = require('../server/validateConfig');
const Logger = require('../src/lib/logger');
const readConfig = require('../src/lib/readConfig');
const mimes = require('./mimes');
const { PrismaClient } = require('@prisma/client');

(async () => {
  const config = readConfig();

  await validateConfig(config);

  process.env.DATABASE_URL = config.core.database_url;

  const files = await readdir(process.argv[2]);
  const data = files.map(x => {
    const mime = mimes[extname(x)] ?? 'application/octet-stream';

    return {
      file: x,
      mimetype: mime,
      userId: 1
    };
  });

  const prisma = new PrismaClient();

  Logger.get('migrator').info('starting migrations...');
  await prisma.image.createMany({
    data
  });
  Logger.get('migrator').info('finished migrations! It is recomended to move your old uploads folder (' + process.argv[2] + ') to the current one which is ' + config.uploader.directory);
  process.exit();
})();