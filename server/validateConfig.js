const { object, bool, string, number, boolean, array } = require('yup');

const validator = object({
  core: object({
    secure: bool().default(false),
    secret: string().min(8).required(),
    host: string().default('0.0.0.0'),
    port: number().default(3000),
    database_url: string().required(),
    logger: boolean().default(false),
    stats_interval: number().default(1800),
  }).required(),
  uploader: object({
    route: string().default('/u'),
    embed_route: string().default('/a'),
    length: number().default(6),
    directory: string().default('./uploads'),
    admin_limit: number().default(104900000),
    user_limit: number().default(104900000),
    disabled_extensions: array().default([]),
  }).required(),
  urls: object({
    route: string().default('/go'),
    length: number().default(6),
  }).required(),
  ratelimit: object({
    user: number().default(0),
    admin: number().default(0),
  }),
});


module.exports = function validate(config) {
  try {
    return validator.validateSync(config, { abortEarly: false });
  } catch (e) {
    if (process.env.ZIPLINE_DOCKER_BUILD) return {};
    throw `${e.errors.length} errors occured\n${e.errors.map(x => '\t' + x).join('\n')}`;
  } 
};