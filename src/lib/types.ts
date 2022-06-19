export interface ConfigCore {
  // Whether to return http or https links
  secure: boolean;

  // Used for signing of cookies and other stuff
  secret: string;

  // The host Zipline will run on
  host: string;

  // The port Zipline will run on
  port: number;

  // The PostgreSQL database url
  database_url: string

  // Whether or not to log stuff
  logger: boolean;

  // The interval to store stats
  stats_interval: number;
}

export interface ConfigDatasource {
  // The type of datasource
  type: 'local' | 's3';

  // The local datasource
  local: ConfigLocalDatasource;
  s3?: ConfigS3Datasource;
}

export interface ConfigLocalDatasource {
  // The directory to store files in
  directory: string;
}

export interface ConfigS3Datasource {
  access_key_id: string;
  secret_access_key: string;
  endpoint?: string;
  bucket: string;
  force_s3_path: boolean;
}

export interface ConfigUploader {
  // The route uploads will be served on
  route: string;

  // Length of random chars to generate for file names
  length: number;

  // Admin file upload limit
  admin_limit: number;

  // User file upload limit
  user_limit: number;

  // Disabled extensions to block from uploading
  disabled_extensions: string[];
}

export interface ConfigUrls {
  // The route urls will be served on
  route: string;

  // Length of random chars to generate for urls
  length: number;
}

// Ratelimiting for users/admins, setting them to 0 disables ratelimiting
export interface ConfigRatelimit {
  // Ratelimit for users
  user: number;

  // Ratelimit for admins
  admin: number;
}

export interface Config {
  core: ConfigCore;
  uploader: ConfigUploader;
  urls: ConfigUrls;
  ratelimit: ConfigRatelimit;
  datasource: ConfigDatasource;
}
