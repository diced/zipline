import "./core/Console";
import {
  Repository,
  Connection,
  createConnection,
  ConnectionOptions,
} from "typeorm";
import { User } from "./entities/User";
import { TypeXServer } from "./server";
import Logger from "@ayanaware/logger";
import { Image } from "./entities/Image";
import { findFile } from "./util";
import { readFileSync } from 'fs';

if (!findFile('config.json', process.cwd())) {
  Logger.get('FS').error(`No config.json exists in the ${__dirname}, exiting...`)
  process.exit(1);
}

const config = JSON.parse(readFileSync(findFile('config.json', process.cwd()), 'utf8'))

if (!config.upload?.route) {
  Logger.get('TypeX.Config').error(`Missing needed property on configuration: upload.route`)
  process.exit(1);
} else if (!config.forever?.route) {
  Logger.get('TypeX.Config').error(`Missing needed property on configuration: forever.route`)
}

export interface ORMRepos {
  user?: Repository<User>;
  image?: Repository<Image>;
}

export interface ORMHandler {
  repos?: ORMRepos;
  connection: Connection;
}

(async () => {
  const connection = await createConnection(config.orm as ConnectionOptions);
  const orm: ORMHandler = {
    connection,
    repos: {
      user: connection.getRepository(User),
      image: connection.getRepository(Image),
    },
  };
  if (orm.connection.isConnected)
    Logger.get(Connection).info(
      `Successfully initialized database type: ${config.orm.type}`
    );
  const server = new TypeXServer(orm);
  server.start();
})();
