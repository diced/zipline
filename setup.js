/* eslint-disable @typescript-eslint/no-var-requires */
const inquirer = require('inquirer');
const { stringify } = require('toml-patch');
const { writeFileSync } = require('fs');
const { join } = require('path');

const createDockerCompose = (port, dir) => {
  return `version: "3"
services:
  zipline:
    ports:
      - "${port}:${port}"
    volumes:
      - "${join(process.cwd(), dir)}:${join('/opt/zipline', dir)}"
    build: .
    tty: true`;
};

const base = {
  database: {},
  meta: {
    title: 'Zipline',
    description: 'My Zipline Server',
    thumbnail:
      'https://github.githubassets.com/images/modules/open_graph/github-mark.png',
    color: '#128377'
  },
  core: {
    secret: 'my-secret',
    port: 3000,
    host: '127.0.0.1',
    theme: 'dark',
    secure: false,
    mfa: false
  },
  uploader: {
    directory: './uploads',
    route: '/u',
    length: 6,
    original: false,
    blacklisted: []
  },
  urls: { route: '/go', length: 4, vanity: true }
};

(async () => {
  const database = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'What database type? (you will have to install the drivers)',
      choices: [
        { name: 'postgres', extra: 'This is what we recomend using.' },
        { name: 'cockroachdb' },
        { name: 'mysql' },
        { name: 'mariadb' },
        { name: 'mssql' },
        { name: 'sqlite' }
      ]
    },
    {
      type: 'input',
      name: 'host',
      message: 'Database Host (leave blank if sqlite3)'
    },
    {
      type: 'number',
      name: 'port',
      message: 'Database Port (leave blank if sqlite3)'
    },
    {
      type: 'input',
      name: 'database',
      message: 'Database Name (db path if sqlite3)'
    },
    {
      type: 'input',
      name: 'username',
      message: 'Database User (leave blank if sqlite3)'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Database Password (leave blank if sqlite3)'
    }
  ]);

  console.log('\nCore\n');

  const core = await inquirer.prompt([
    {
      type: 'input',
      name: 'secret',
      message: 'Secret (this must be secure)'
    },
    {
      type: 'number',
      name: 'port',
      message: 'Serve on Port'
    },
    {
      type: 'list',
      name: 'theme',
      message: 'Theme',
      choices: [
        { name: 'dark' },
        { name: 'light' }
      ]
    },
    {
      type: 'confirm',
      name: 'mfa',
      message: 'Enable 2 Factor Authentication with Authy/Google Authenticator'
    }
  ]);

  console.log('\nUploader\n');

  const uploader = await inquirer.prompt([
    {
      type: 'input',
      name: 'directory',
      message: 'Uploads Directory'
    },
    {
      type: 'confirm',
      name: 'original',
      message: 'Keep Original File names?'
    }
  ]);

  console.log('\nURLs\n');

  const urls = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'vanity',
      message: 'Allow vanity URLs'
    }
  ]);

  console.log('\nDocker\n');

  const docker = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useDocker',
      message: 'Use Docker?'
    }
  ]);

  const config = {
    database: { ...database },
    meta: { ...base.meta },
    core: { ...base.core, ...core },
    uploader: { ...base.uploader, ...uploader },
    urls: { ...base.urls, ...urls }
  };

  if (docker.useDocker) {
    config.core.host = '0.0.0.0';
    console.log('Generating docker-compose.yml...');
    writeFileSync('docker-compose.yml', createDockerCompose(config.core.port, config.uploader.directory));
    console.log(
      'Head to https://zipline.diced.wtf/docs/docker to learn how to run with docker.'
    );
  }
  if (config.database.type !== "postgres") console.log(`please head to https://zipline.diced.wtf/docs/config/getting-started#database to see what drivers you need to install for ${config.database.type}`);

  writeFileSync('Zipline.toml', stringify(config));
})();
