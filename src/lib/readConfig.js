const { existsSync, readFileSync } = require('fs');
const { join } = require('path');
const Logger = require('./logger');

const e = (val, type, fn, required = true) => ({ val, type, fn, required });

const envValues = [
  e('SECURE', 'boolean', (c, v) => c.core.secure = v),
  e('SECRET', 'string', (c, v) => c.core.secret = v),
  e('HOST', 'string', (c, v) => c.core.host = v),
  e('PORT', 'number', (c, v) => c.core.port = v),
  e('DATABASE_URL', 'string', (c, v) => c.core.database_url = v),
  e('UPLOADER_ROUTE', 'string', (c, v) => c.uploader.route = v),
  e('UPLOADER_EMBED_ROUTE', 'string', (c, v) => c.uploader.embed_route = v),
  e('UPLOADER_LENGTH', 'number', (c, v) => c.uploader.length = v),
  e('UPLOADER_DIRECTORY', 'string', (c, v) => c.uploader.directory = v),
  e('UPLOADER_ADMIN_LIMIT', 'number', (c, v) => c.uploader.admin_limit = v),
  e('UPLOADER_USER_LIMIT', 'number', (c, v) => c.uploader.user_limit = v),
  e('UPLOADER_DISABLED_EXTS', 'array', (c, v) => c.uploader.disabled_extentions = v),
];

module.exports = () => {
  if (!existsSync(join(process.cwd(), 'config.toml'))) {
    Logger.get('config').info('reading environment');
    return tryReadEnv();
  } else {
    Logger.get('config').info('reading config file');
    const str = readFileSync(join(process.cwd(), 'config.toml'), 'utf8');
    const parsed = require('@iarna/toml/parse-string')(str);

    return parsed;
  }
};

function tryReadEnv() {
  const config = {
    core: {
      secure: undefined,
      secret: undefined,
      host: undefined,
      port: undefined,
      database_url: undefined,
    },
    uploader: {
      route: undefined,
      embed_route: undefined,
      length: undefined,
      directory: undefined,
      admin_limit: undefined,
      user_limit: undefined,
      disabled_extentions: undefined
    }
  };

  for (let i = 0, L = envValues.length; i !== L; ++i) {
    const envValue = envValues[i];
    let value = process.env[envValue.val];

    if (envValue.required && !value) {
      Logger.get('config').error('there is no config file or required environment variables... exiting...');

      process.exit(1);
    }

    envValues[i].fn(config, value);
    if (envValue.type === 'number') value = parseToNumber(value);
    else if (envValue.type === 'boolean') value = parseToBoolean(value);
    else if (envValue.type === 'array') value = parseToArray(value);
    envValues[i].fn(config, value);
  }

  return config;
}

function parseToNumber(value) {
  // infer that it is a string since env values are only strings
  const number = Number(value);
  if (isNaN(number)) return undefined;
  return number;
}

function parseToBoolean(value) {
  // infer that it is a string since env values are only strings
  if (!value || value === 'false') return false;
  else return true;
}

function parseToArray(value) {
  return value.split(',');
}