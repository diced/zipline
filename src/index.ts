import './core/Console';
import { Repository, Connection, createConnection, ConnectionOptions } from "typeorm";
import { User } from "./entities/User";
import { TypeXServer } from "./server";
import config from '../config.json';
import Logger from "@ayanaware/logger";
import { Image } from "./entities/Image";

export interface ORMRepos {
  user?: Repository<User>;
  image?: Repository<Image>;
}

export interface ORMHandler {
  repos?: ORMRepos;
  connection: Connection;
}

(async () => {
  const connection = await createConnection(config.orm as ConnectionOptions)
  const orm: ORMHandler = {
    connection,
    repos: {
      user: connection.getRepository(User),
      image: connection.getRepository(Image)
    }
  };
  if (orm.connection.isConnected) Logger.get(Connection).info(`Successfully initialized postgres`)
  const server = new TypeXServer(orm);
  server.start(config.port)
})();