export interface ConfigCore {
  // Whether to return http or https links
  secure: boolean;

  // Used for signing of cookies and other stuff
  secret: string;

  // The host Zipline will run on
  host: string;

  // The port Zipline will run on
  port: number;
}

export interface ConfigDatabase {
  type: 'psql';
  url: string;
}

export interface ConfigUploader {
  // The route uploads will be served on
  route: string;

  // The route embedded routes will be served on
  embed_route: string;

  // Length of random chars to generate for file names
  length: number;

  // Where uploads are stored
  directory: string;
}

export interface Config {
  core: ConfigCore;
  database: ConfigDatabase;
  uploader: ConfigUploader;
}