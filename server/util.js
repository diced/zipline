const { readFile, readdir, stat } = require('fs/promises');
const { join } = require('path');
const { Migrate } = require('@prisma/migrate/dist/Migrate.js');
const Logger = require('../src/lib/logger.js');

async function migrations() {
  const migrate = new Migrate('./prisma/schema.prisma');
  const diagnose = await migrate.diagnoseMigrationHistory({
    optInToShadowDatabase: false,
  });

  if (diagnose.history?.diagnostic === 'databaseIsBehind') {
    Logger.get('database').info('migrating database');
    await migrate.applyMigrations();
    Logger.get('database').info('finished migrating database');
  }

  migrate.stop();
}

function log(url) {
  if (url.startsWith('/_next') || url.startsWith('/__nextjs')) return;
  return Logger.get('url').info(url);
}

function shouldUseYarn() {
  try {
    execSync('yarnpkg --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}


async function getFile(dir, file) {
  try {
    const data = await readFile(join(process.cwd(), dir, file));
    return data;
  } catch (e) {
    return null;
  }
}

async function sizeOfDir(directory) {
  const files = await readdir(directory);
  
  let size = 0;
  for (let i = 0, L = files.length; i !== L; ++i) {
    const sta = await stat(join(directory, files[i]));
    size += sta.size;
  }

  return size;
}

function bytesToRead(bytes) {
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
  let num = 0;

  while (bytes > 1024) {
    bytes /= 1024;
    ++num;
  }

  return `${bytes.toFixed(1)} ${units[num]}`;
}


async function getStats(prisma, config) {
  const size = await sizeOfDir(join(process.cwd(), config.uploader.directory));
  const byUser = await prisma.image.groupBy({
    by: ['userId'],
    _count: {
      _all: true,
    },
  });
  const count_users = await prisma.user.count();

  const count_by_user = [];
  for (let i = 0, L = byUser.length; i !== L; ++i) {
    const user = await prisma.user.findFirst({
      where: {
        id: byUser[i].userId,
      },
    });

    count_by_user.push({
      username: user.username,
      count: byUser[i]._count._all,
    });
  }

  const count = await prisma.image.count();
  const viewsCount = await prisma.image.groupBy({
    by: ['views'],
    _sum: {
      views: true,
    },
  });

  const typesCount = await prisma.image.groupBy({
    by: ['mimetype'],
    _count: {
      mimetype: true,
    },
  });
  const types_count = [];
  for (let i = 0, L = typesCount.length; i !== L; ++i) types_count.push({ mimetype: typesCount[i].mimetype, count: typesCount[i]._count.mimetype });

  return {
    size: bytesToRead(size),
    size_num: size,
    count,
    count_by_user: count_by_user.sort((a,b) => b.count-a.count),
    count_users,
    views_count: (viewsCount[0]?._sum?.views ?? 0),
    types_count: types_count.sort((a,b) => b.count-a.count),
  };
}

module.exports = {
  migrations,
  bytesToRead,
  getFile,
  getStats,
  log,
  sizeOfDir,
  shouldUseYarn,
};