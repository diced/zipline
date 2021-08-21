const { copyFileSync, readdirSync, statSync, existsSync, mkdirSync } = require('fs');
const { join, sep } = require('path');
const rimraf = require('rimraf');
const Logger = require('../src/lib/logger');
const prismaRun = require('./prisma-run');

function recursive(dir) {
  let res = [];
  const files = readdirSync(dir);
  for (let i = 0, L = files.length; i !== L; ++i) {
    const file = join(dir, files[i]);
    if (statSync(file).isDirectory()) res = [...res, ...recursive(file)];
    else res.push(file);
  }

  return res;
}

module.exports = async (config) => {
  try {
    const prisma = join(process.cwd(), 'prisma');
    const migrationsDir = join(prisma, 'migrations_' + config.database.type);
    const destMigrations = join(prisma, 'migrations');
    const migrationFiles = recursive(migrationsDir);
    const destFiles = migrationFiles.map(x => x.replace(migrationsDir + sep, destMigrations + sep));
  
    if (existsSync(destMigrations)) rimraf.sync(destMigrations);
    mkdirSync(destMigrations);
    mkdirSync(join(destMigrations, config.database.type));
  
    for (let i = 0, L = migrationFiles.length; i !== L; ++i) {
      copyFileSync(migrationFiles[i], destFiles[i]);
    }
  
    await prismaRun(config.database.url, ['migrate', 'deploy', `--schema=prisma/schema.${config.database.type}.prisma`]);
    await prismaRun(config.database.url, ['generate', `--schema=prisma/schema.${config.database.type}.prisma`]);
    await prismaRun(config.database.url, ['db', 'seed', '--preview-feature', `--schema=prisma/schema.${config.database.type}.prisma`]);
  } catch (e) {
    console.log(e);
    Logger.get('db').error('there was an error.. exiting..');
    rimraf.sync(join(process.cwd(), 'prisma', 'migrations'));
    process.exit(1);
  }
};