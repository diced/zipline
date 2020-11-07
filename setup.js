/* eslint-disable @typescript-eslint/no-var-requires */
const inquirer = require('inquirer');
const { stringify } = require('toml-patch');
const { writeFileSync } = require('fs');
const { join } = require('path');

const createDockerCompose = (port) => {
  return `version: "3"
services:
  zipline:
    ports:
      - "${port}:${port}"
    volumes:
      - "${join(process.cwd(), 'uploads')}:/opt/zipline/uploads"
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
  core: { secret: 'my-secret', port: 3000, host: '127.0.0.1', theme: 'dark', secure: false },
  uploader: {
    directory: './uploads',
    route: '/u',
    length: 6,
    original: false,
    blacklisted: []
  },
  urls: { route: '/s', length: 4, vanity: false }
};

(async () => {
  const database = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'What database type?',
      choices: [
        { name: 'postgres', extra: 'This is what we recomend using.' },
        { name: 'cockroachdb' },
        { name: 'mysql' },
        { name: 'mariadb' },
        { name: 'mssql' },
        { name: 'sqlite3' }
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

  writeFileSync('Ziplined.toml', stringify(config));

  if (docker.useDocker) {
    console.log('Generating docker-compose.yml...');
    writeFileSync('docker-compose.yml', createDockerCompose(config.core.port));
  }
})();
