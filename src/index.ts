import "./core/Console";
import { Repository, Connection, createConnection } from "typeorm";
import { User } from "./entities/User";
import { ZiplineServer } from "./server";
import Logger from "@ayanaware/logger";
import { Image } from "./entities/Image";
import { findFile } from "./util";
import { readFileSync } from "fs";
import { Shorten } from "./entities/Shorten";
import { Note } from "./entities/Note";
import { notes } from "./interval";
import { GitHub } from "./structures/GitHub";
import { compare } from "semver";
import chalk from "chalk";

if (!findFile("config.json", process.cwd())) {
  Logger.get("FS").error(`No config.json exists in ${__dirname}, exiting...`);
  process.exit(1);
}

const config = JSON.parse(
  readFileSync(findFile("config.json", process.cwd()), "utf8")
);

if (!config.uploader?.route) {
  Logger.get("Zipline.Config").error(
    `Missing needed property on configuration: upload.route`
  );
  process.exit(1);
}

export interface ORMRepos {
  user?: Repository<User>;
  image?: Repository<Image>;
  shorten?: Repository<Shorten>;
  note?: Repository<Note>;
}

export interface ORMHandler {
  repos?: ORMRepos;
  connection: Connection;
}

const pk = JSON.parse(
  readFileSync(findFile("package.json", process.cwd()), "utf8")
);

(async () => {
  if (
    compare(
      JSON.parse(await GitHub.getFile("package.json")).version,
      pk.version
    ) == 1
  )
    Logger.get(`Zipline`).info(
      `Zipline is ${chalk.bold.redBright(
        "outdated"
      )}, you should run ${chalk.bold.whiteBright(
        "./scripts/update.sh"
      )} to get the best features.`
    );
  Logger.get("Zipline").info(`Starting Zipline ${pk.version}`);
  if (!config.database)
    return Logger.get("Config").error("Database is not found in config.");
  const connection = await createConnection(config.database);
  const orm: ORMHandler = {
    connection,
    repos: {
      user: connection.getRepository(User),
      image: connection.getRepository(Image),
      shorten: connection.getRepository(Shorten),
      note: connection.getRepository(Note),
    },
  };

  if (orm.connection.isConnected)
    Logger.get(Connection).info(
      `Successfully initialized database type: ${config.database.type}`
    );
  const server = new ZiplineServer(orm);
  server.start();
  Logger.get("Interval").info("Starting Notes interval");
  notes(orm);
})();
