export interface Config {
  core: ConfigCore;
}

export interface ConfigCore {
  port: number;
  sessionSecret: string;
  databaseUrl: string;
}
