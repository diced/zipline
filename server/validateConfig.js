const Logger = require('../src/lib/logger');
const yup = require('yup');


const validator = yup.object({
  core: yup.object({
    secure: yup.bool().default(false),
    secret: yup.string().min(8).required(),
    host: yup.string().default('0.0.0.0'),
    port: yup.number().default(3000),
    database_url: yup.string().required(),
    logger: yup.boolean().default(true),
    stats_interval: yup.number().default(1800),
  }).required(),
  uploader: yup.object({
    route: yup.string().default('/u'),
    embed_route: yup.string().default('/a'),
    length: yup.number().default(6),
    directory: yup.string().default('./uploads'),
    admin_limit: yup.number().default(104900000),
    user_limit: yup.number().default(104900000),
    disabled_extensions: yup.array().default([]),
  }).required(),
  urls: yup.object({
    route: yup.string().default('/go'),
    length: yup.number().default(6),
  }).required(),
  ratelimit: yup.object({
    user: yup.number().default(0),
    admin: yup.number().default(0),
  }),
});


module.exports = config => {
  try {
    return validator.validateSync(config, { abortEarly: false });
  } catch (e) {
    throw `${e.errors.length} errors occured\n${e.errors.map(x => '\t' + x).join('\n')}`;
  } 
};