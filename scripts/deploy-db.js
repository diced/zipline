const Logger = require('../src/lib/logger');
const prismaRun = require('./prisma-run');

module.exports = async (config) => {
  try {
    await prismaRun(config.database.url, ['migrate', 'deploy', '--schema=prisma/schema.prisma']);
    await prismaRun(config.database.url, ['generate', '--schema=prisma/schema.prisma']);
    await prismaRun(config.database.url, ['db', 'seed', '--preview-feature', '--schema=prisma/schema.prisma']);
  } catch (e) {
    console.log(e);
    Logger.get('db').error('there was an error.. exiting..');
    process.exit(1);
  }
};