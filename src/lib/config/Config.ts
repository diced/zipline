export interface ConfigCore {
  https: boolean;
  secret: string;
  host: string;
  port: number;
  database_url: string;
  logger: boolean;
  
  stats_interval: number;
  invites_interval: number;
}

export interface ConfigDatasource {
  type: 'local' | 's3' | 'swift';
  local: ConfigLocalDatasource;
  s3?: ConfigS3Datasource;
  swift?: ConfigSwiftDatasource;
}

export interface ConfigLocalDatasource {
  directory: string;
}

export interface ConfigS3Datasource {
  access_key_id: string;
  secret_access_key: string;
  endpoint?: string;
  bucket: string;
  force_s3_path: boolean;
  use_ssl: boolean;
  region?: string;
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
  route: string;
  length: number;
  admin_limit: number;
  user_limit: number;
  disabled_extensions: string[];
  format_date: string;
}

export interface ConfigUrls {
  route: string;
  length: number;
}

export interface ConfigRatelimit {
  user: number;
  admin: number;
}

export interface ConfigWebsite {
  title: string;
  show_files_per_user: boolean;
  show_version: boolean;
  disable_media_preview: boolean;

  external_links: ConfigWebsiteExternalLinks[];
}

export interface ConfigWebsiteExternalLinks {
  label: string;
  url: string;
}

export interface ConfigDiscord {
  url: string;
  username: string;
  avatar_url: string;

  upload: ConfigDiscordContent;
  shorten: ConfigDiscordContent;
}

export interface ConfigDiscordContent {
  content: string;
  embed: ConfigDiscordEmbed;
}

export interface ConfigDiscordEmbed {
  title?: string;
  description?: string;
  footer?: string;
  color?: number;
  thumbnail?: boolean;
  timestamp: boolean;
  image: boolean;
}

export interface ConfigFeatures {
  invites: boolean;
  oauth_registration: boolean;
}

export interface ConfigOAuth {
  github_client_id?: string;
  github_client_secret?: string;

  discord_client_id?: string;
  discord_client_secret?: string;
}

export interface Config {
  core: ConfigCore;
  uploader: ConfigUploader;
  urls: ConfigUrls;
  ratelimit: ConfigRatelimit;
  datasource: ConfigDatasource;
  website: ConfigWebsite;
  discord: ConfigDiscord;
  oauth: ConfigOAuth;
  features: ConfigFeatures;
}