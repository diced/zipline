const Logger = require('../src/lib/logger');
const prismaRun = require('./prisma-run');

module.exports = async (config) => {
  try {
    await prismaRun(config.database.url, ['migrate', 'deploy']);
    await prismaRun(config.database.url, ['generate']);
  } catch (e) {
    console.log(e);
    Logger.get('db').error('there was an error.. exiting..');
    process.exit(1);
  }
};