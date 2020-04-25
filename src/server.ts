import * as bodyParser from "body-parser";
import { Server } from "@overnightjs/core";
import { Connection } from "typeorm";
import { ORMHandler } from ".";
import Logger from "@ayanaware/logger";
import config from "../config.json";
import * as express from "express";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import session from "express-session";
import cookies from "cookie-parser";
import { APIController } from "./controllers/APIController";
import { IndexController } from "./controllers/IndexController";

export class TypeXServer extends Server {
  constructor(orm: ORMHandler) {
    super();
    this.app.use(
      session({
        secret: config.sessionSecret,
        resave: false,
        saveUninitialized: false,
      })
    );
    this.app.use(cookies());
    this.app.set("view engine", "ejs");
    this.app.use("/u", express.static("uploads"));
    this.app.use("/public", express.static("public"));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.setupControllers(orm);
  }

  private setupControllers(orm: ORMHandler): void {
    const api = new APIController().set(orm);
    const index = new IndexController().set(orm);
    super.addControllers([index, api]);
  }

  public start(): void {
    // this.app.listen(port, () => {
    //   Logger.get(TypeXServer).info('Started server on port ' + port);
    // })
    if (config.site.protocol === "https") {
      const key = fs.readFileSync(config.site.ssl.key, "utf-8");
      const cert = fs.readFileSync(config.site.ssl.cert, "utf-8");
      const creds = { key, cert };

      const httpsServer = https.createServer(creds, this.app);
      httpsServer.listen(config.site.httpsPort, () => {
        Logger.get(TypeXServer).info(
          "Started https server on port " + config.site.httpsPort
        );
      });
    } else {
      const httpServer = http.createServer(this.app);
      httpServer.listen(config.site.httpPort, () => {
        Logger.get(TypeXServer).info(
          "Started http server on port " + config.site.httpPort
        );
      });
    }
  }
}
