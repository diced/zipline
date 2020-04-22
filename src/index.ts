import { Repository, Connection, createConnection } from "typeorm";
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
  const orm: ORMHandler = {
    //@ts-ignore
    connection: await createConnection(config.orm)
  };
  if (orm.connection.isConnected) Logger.get(Connection).info(`Successfully initialized postgres`)
  orm.repos = {
    user: orm.connection.getRepository(User),
    image: orm.connection.getRepository(Image)
  };

  const server = new TypeXServer(orm);
  server.start(config.port)
})();