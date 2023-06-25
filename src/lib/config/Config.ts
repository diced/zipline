export interface Config {
  core: ConfigCore;
  files: ConfigFiles;
}

export interface ConfigCore {
  port: number;
  sessionSecret: string;
  databaseUrl: string;
}

export interface ConfigFiles {
  route: string;
}
