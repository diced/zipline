/* eslint-disable @typescript-eslint/no-var-requires */
const inquirer = require('inquirer');
const { stringify } = require('toml-patch');
const { writeFileSync } = require('fs');

const base = {
  database: {},
  meta: {
    title: 'Zipline',
    description: 'My Zipline Server',
    thumbnail:
      'https://github.githubassets.com/images/modules/open_graph/github-mark.png',
    color: '#128377'
  },
  core: { secret: 'my-secret', port: 3000 },
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
        { name: 'sqlite' },
        { name: 'sqlite3' },
        { name: 'mongodb', extra: 'No support yet' }
      ]
    },
    {
      type: 'input',
      name: 'host',
      message: 'Database Host'
    },
    {
      type: 'number',
      name: 'port',
      message: 'Database Port'
    },
    {
      type: 'input',
      name: 'database',
      message: 'Database Name'
    },
    {
      type: 'input',
      name: 'username',
      message: 'Database User'
    },
    {
      type: 'password',
      name: 'password',
      message: 'Database Password'
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
      message: 'Keep Original?'
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

  const config = {
    database: { ...database },
    meta: { ...base.meta },
    core: { ...base.core, ...core },
    uploader: { ...base.uploader, ...uploader },
    urls: { ...base.urls, ...urls }
  };
  writeFileSync('Zipline.toml', stringify(config));
})();
