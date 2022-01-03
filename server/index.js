const next = require('next');
const { createServer } = require('http');
const { stat, mkdir, readdir } = require('fs/promises');
const { execSync } = require('child_process');
const { extname, join } = require('path');
const { PrismaClient } = require('@prisma/client');
const validateConfig = require('./validateConfig');
const Logger = require('../src/lib/logger');
const getFile = require('./static');
const prismaRun = require('../scripts/prisma-run');
const readConfig = require('../src/lib/readConfig');
const mimes = require('../scripts/mimes');
const deployDb = require('../scripts/deploy-db');
const { version } = require('../package.json');

Logger.get('server').info(`starting zipline@${version} server`);

const dev = process.env.NODE_ENV === 'development';

function log(url, status) {
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

(async () => {
  try {
    const a = readConfig();
    const config = await validateConfig(a);

    const data = await prismaRun(config.core.database_url, ['migrate', 'status'], true);
    if (data.match(/Following migrations? have not yet been applied/)) {
      Logger.get('database').info('some migrations are not applied, applying them now...');
      await deployDb(config);
      Logger.get('database').info('finished applying migrations');
    } else Logger.get('database').info('migrations up to date');
    process.env.DATABASE_URL = config.core.database_url;

    await mkdir(config.uploader.directory, { recursive: true });

    const app = next({
      dir: '.',
      dev,
      quiet: dev,
    }, config.core.port, config.core.host);

    await app.prepare();
    await stat('./.next');

    const handle = app.getRequestHandler();
    const prisma = new PrismaClient();
  
    const srv = createServer(async (req, res) => {
      if (req.url.startsWith('/r')) {
        const parts = req.url.split('/');
        if (!parts[2] || parts[2] === '') return;

        let image = await prisma.image.findFirst({
          where: {
            OR: [
              { file: parts[2] },
              { invisible:{ invis: decodeURI(parts[2]) } },
            ],
          },
          select: {
            mimetype: true,
            id: true,
            file: true,
            invisible: true,
          },
        });

        if (!image) {
          const data = await getFile(config.uploader.directory, parts[2]);
          if (!data) return app.render404(req, res);

          const mimetype = mimes[extname(parts[2])] ?? 'application/octet-stream';
          res.setHeader('Content-Type', mimetype);
          res.end(data);
        } else {
          if (image) {
            const data = await getFile(config.uploader.directory, image.file);
            if (!data) return app.render404(req, res);

            await prisma.image.update({
              where: { id: image.id },
              data: { views: { increment: 1 } },
            });
            res.setHeader('Content-Type', image.mimetype);
            res.end(data);
          } else {
            const data = await getFile(config.uploader.directory, parts[2]);
            if (!data) return app.render404(req, res);
  
            const mimetype = mimes[extname(parts[2])] ?? 'application/octet-stream';
            res.setHeader('Content-Type', mimetype);
            res.end(data);
          }

        }
      } else {
        handle(req, res);
      }

      if (config.core.logger) log(req.url, res.statusCode);
    });

    srv.on('error', (e) => {
      Logger.get('server').error(e);

      process.exit(1);
    });
    srv.on('listening', () => {
      Logger.get('server').info(`listening on ${config.core.host}:${config.core.port}`);
      if (process.platform === 'linux' && dev) execSync(`xdg-open ${config.core.secure ? 'https' : 'http'}://${config.core.host === '0.0.0.0' ? 'localhost' : config.core.host}:${config.core.port}`);
    });

    srv.listen(config.core.port, config.core.host ?? '0.0.0.0');

    const stats = await getStats(prisma, config);
    await prisma.stats.create({
      data: {
        data: stats,
      },
    });
    setInterval(async () => {
      const stats = await getStats(prisma, config);
      await prisma.stats.create({
        data: {
          data: stats,
        },
      });
      if (config.core.logger) Logger.get('server').info('stats updated');
    }, config.core.stats_interval * 1000);
  } catch (e) {
    if (e.message && e.message.startsWith('Could not find a production')) {
      Logger.get('web').error(`there is no production build - run \`${shouldUseYarn() ? 'yarn build' : 'npm build'}\``);
    } else if (e.code && e.code === 'ENOENT') {
      if (e.path === './.next') Logger.get('web').error(`there is no production build - run \`${shouldUseYarn() ? 'yarn build' : 'npm build'}\``);
    } else {
      Logger.get('server').error(e);
      process.exit(1);
    }
  }
})();

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