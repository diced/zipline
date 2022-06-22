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
  database_url: string;

  // Whether or not to log stuff
  logger: boolean;

  // The interval to store stats
  stats_interval: number;
}

export interface ConfigDatasource {
  // The type of datasource
  type: 'local' | 's3' | 'swift';

  // The local datasource, the default
  local: ConfigLocalDatasource;

  // The s3 datasource
  s3?: ConfigS3Datasource;
  // The Swift datasource
  swift?: ConfigSwiftDatasource;
}

export interface ConfigLocalDatasource {
  // The directory to store files in
  directory: string;
}

export interface ConfigS3Datasource {
  // The access key id for the s3 bucket
  access_key_id: string;

  // The secret access key for the s3 bucket
  secret_access_key: string;

  // Not required, but if using a non-aws S3 service you can specify the endpoint
  endpoint?: string;

  // The S3 bucket to store files in
  bucket: string;

  // If true Zipline will attempt to connect to the bucket via the url "https://s3.amazonaws.com/{bucket}/stuff"
  // If false Zipline will attempt to connect to the bucket via the url "http://{bucket}.s3.amazonaws.com/stuff"
  force_s3_path: boolean;
}

export interface ConfigSwiftDatasource {
  container: string;
  auth_endpoint: string;
  username: string;
  password: string;
  project_id: string;
  domain_id?: string;
  region_id?: string;
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