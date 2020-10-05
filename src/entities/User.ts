import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { randomId, findFile } from "../util";
import Logger from "@ayanaware/logger";
import { readFileSync } from "fs";

if (!findFile("config.json", process.cwd())) {
  Logger.get("FS").error(
    `No config.json exists in the ${__dirname}, exiting...`
  );
  process.exit(1);
}

const config = JSON.parse(
  readFileSync(findFile("config.json", process.cwd()), "utf8")
);

@Entity()
export class User {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: number;

  @Column("text")
  username: string;

  @Column("text")
  password: string;

  @Column("text")
  token: string;

  @Column("boolean")
  administrator: boolean;

  set(options: { username: string; password: string; administrator: boolean }) {
    this.username = options.username;
    this.password = options.password;
    this.administrator = options.administrator;
    this.token = randomId(config.core.userTokenLength);
    return this;
  }
}
