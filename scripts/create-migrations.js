const prismaRun = require('./prisma-run');
const remove = require('rimraf').sync;
const { readFileSync, readdirSync, statSync, renameSync } = require('fs');
const { join } = require('path');


const str = readFileSync('./config.toml');
const config = require('@iarna/toml/parse-string')(str);

remove('prisma/migrations*');

function getFirstDir(dir) {
  const files = readdirSync(dir);
  for (const file of files) {
    if (statSync(join(dir, file)).isDirectory()) return join(dir, file);  
  }
}

function createPSQLMigrations() {
  prismaRun(config.database.psql_url, 'psql', ['migrate', 'dev', '--skip-seed', '--name=psql', '--schema=prisma/schema.psql.prisma']);
  const dir = getFirstDir('./prisma/migrations');
  renameSync(dir, './prisma/migrations/psql');
  renameSync('./prisma/migrations', './prisma/migrations_psql');
}

function createMYSQLMigrations() {
  prismaRun(config.database.mysql_url, 'mysql', ['migrate', 'dev', '--skip-seed', '--name=mysql', '--schema=prisma/schema.mysql.prisma']);
  const dir = getFirstDir('./prisma/migrations');
  renameSync(dir, './prisma/migrations/mysql');
  renameSync('./prisma/migrations', './prisma/migrations_mysql');
}

function createSqliteMigrations() {
  prismaRun(config.database.sqlite_url, 'sqlite', ['migrate', 'dev', '--skip-seed', '--name=sqlite', '--schema=prisma/schema.sqlite.prisma']);
  const dir = getFirstDir('./prisma/migrations');
  renameSync(dir, './prisma/migrations/sqlite');
  renameSync('./prisma/migrations', './prisma/migrations_sqlite');
}

createPSQLMigrations();
createMYSQLMigrations();
createSqliteMigrations();