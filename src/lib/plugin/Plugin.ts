import { FastifyInstance } from "fastify";
import Server from "next/dist/next-server/server/next-server";
import { Connection } from "typeorm";
import { Config } from "../Config";

export interface Plugin {
  name: string;
  priority?: number;

  onLoad(server: FastifyInstance, orm: Connection, app: Server, config: Config): any;
}