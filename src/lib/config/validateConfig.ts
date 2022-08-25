import { Config } from 'lib/config/Config';
import { object, bool, string, number, boolean, array } from 'yup';

const discord_content = object({
  content: string().nullable(),
  embed: object({
    title: string().nullable().default(null),
    description: string().nullable().default(null),
    footer: string().nullable().default(null),
    color: string().nullable().default(null),
    thumbnail: boolean().default(false),
    image: boolean().default(true),
    timestamp: boolean().default(true),
  }).nullable().default(null),
}).nullable().default(null);

const validator = object({
  core: object({
    https: bool().default(false),
    secret: string().min(8).required(),
    host: string().default('0.0.0.0'),
    port: number().default(3000),
    database_url: string().required(),
    logger: boolean().default(false),
    stats_interval: number().default(1800),
    invites_interval: number().default(1800),
  }).required(),
  datasource: object({
    type: string().oneOf(['local', 's3', 'swift']).default('local'),
    local: object({
      directory: string().default('./uploads'),
    }),
    s3: object({
      access_key_id: string(),
      secret_access_key: string(),
      endpoint: string(),
      bucket: string(),
      force_s3_path: boolean().default(false),
      region: string().default('us-east-1'),
    }).nullable().notRequired(),
    swift: object({
      username: string(),
      password: string(),
      auth_endpoint: string(),
      container: string(),
      project_id: string(),
      domain_id: string().default('default'),
      region_id: string().nullable(),
    }).nullable().notRequired(),
  }).required(),
  uploader: object({
    route: string().default('/u'),
    embed_route: string().default('/a'),
    length: number().default(6),
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
  website: object({
    title: string().default('Zipline'),
    show_files_per_user: boolean().default(true),
    show_version: boolean().default(true),
  }),
  discord: object({
    url: string(),
    username: string().default('Zipline'),
    avatar_url: string().default('https://raw.githubusercontent.com/diced/zipline/9b60147e112ec5b70170500b85c75ea621f41d03/public/zipline.png'),
    upload: discord_content,
    shorten: discord_content,
  }).optional().nullable().default(null),
});

export default function validate(config): Config {
  try {
    const validated = validator.validateSync(config, { abortEarly: false });
    switch (validated.datasource.type) {
      case 's3': {
        const errors = [];
        if (!validated.datasource.s3.access_key_id)
          errors.push('datasource.s3.access_key_id is a required field');
        if (!validated.datasource.s3.secret_access_key)
          errors.push('datasource.s3.secret_access_key is a required field');
        if (!validated.datasource.s3.bucket)
          errors.push('datasource.s3.bucket is a required field');
        if (!validated.datasource.s3.endpoint)
          errors.push('datasource.s3.endpoint is a required field');
        if (errors.length) throw { errors };
        break;
      }
      case 'swift': {
        const errors = [];
        if (!validated.datasource.swift.container)
          errors.push('datasource.swift.container is a required field');
        if (!validated.datasource.swift.project_id)
          errors.push('datasource.swift.project_id is a required field');
        if (!validated.datasource.swift.auth_endpoint)
          errors.push('datasource.swift.auth_endpoint is a required field');
        if (!validated.datasource.swift.password)
          errors.push('datasource.swift.password is a required field');
        if (!validated.datasource.swift.username)
          errors.push('datasource.swift.username is a required field');
        if (errors.length) throw { errors };
        break;
      }
    }

    return validated as unknown as Config;
  } catch (e) {
    if (process.env.ZIPLINE_DOCKER_BUILD) return null;
    throw `${e.errors.length} errors occured\n${e.errors.map((x) => '\t' + x).join('\n')}`;
  }
}