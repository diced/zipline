import * as bodyParser from "body-parser";
import { Server } from "@overnightjs/core";
import { Connection } from "typeorm";
import { ORMHandler } from ".";
import Logger from "@ayanaware/logger";
import * as express from "express";
import * as http from "http";
import * as https from "https";
import * as fs from "fs";
import session from "express-session";
import cookies from "cookie-parser";
import { APIController } from "./controllers/APIController";
import { IndexController } from "./controllers/IndexController";
import { findFile } from "./util";
import { ImageUtil } from "./structures/ImageUtil";

if (!findFile('config.json', process.cwd())) {
  Logger.get('FS').error(`No config.json exists in the ${__dirname}, exiting...`)
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(findFile('config.json', process.cwd()), 'utf8'))

export class ZiplineServer extends Server {
  constructor(orm: ORMHandler) {
    super();
    if (config.core.trustedProxy) {
      proxy += ',' + config.core.trustedProxy;
    }    this.app.set("view engine", "ejs");
    this.app.use(
      session({
        secret: config.core.sessionSecret,
        resave: false,
        saveUninitialized: false,
      })
    );
    this.app.use(async (req, res, next) => {
      if (!req.url.startsWith(config.uploader.route)) return next();
      const upload = await orm.repos.image.findOne({ url: `${config.secure ? "https" : "http"}://${req.headers['host']}${req.url}` });
      if (!upload) return next();
      upload.views++;
      orm.repos.image.save(upload);
      return next();
    })
    this.app.use(cookies());
    try {
      this.app.use(config.uploader.route, express.static(config.uploader.upload));
    } catch (e) {
      Logger.get('TypeX.Routes').error(`Could not formulate upload static route`)
      process.exit(1);
    }
    this.app.use("/public", express.static("public"));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(async (req, res, next) => {
      if (!config.core.log) return next();
      if (req.url.startsWith(config.uploader.route)) return next();
      let user = req.session.user;
      const users = await orm.repos.user.find({ where: { token: req.headers['authorization'] } });
      if (users[0]) user = users[0]
      Logger.get('TypeX.Route').info(`Route ${req.url} was accessed by ${user ? user.username : '<no user found>'}`)
      return next();
    });

    this.setupControllers(orm);
  }

  private setupControllers(orm: ORMHandler): void {
    const api = new APIController().set(orm);
    const index = new IndexController().set(orm);
    super.addControllers([index, api]);
    this.app.get('*', (req, res) => {
      return res.status(200).render('404');
    })
    this.app.use((err, req, res, next) => {
      Logger.get(this.app).error(err);
      return res.status(500).render('error');
    });
  }

  public start(): void {
    let server;
    if (config.core.secure) {
      try {
        const creds = {
          key: fs.readFileSync(config.core.ssl.key, "utf-8"),
          cert: fs.readFileSync(config.core.ssl.cert, "utf-8")
        };
        server = https.createServer(creds, this.app);
      } catch (e) {
        if (e.code === 'ENOENT') {
          Logger.get('ZiplineServer.FS').error(`No file/directory found for ${e.path}`);
          process.exit(1);
        }
      }
    } else server = http.createServer(this.app);

    server.listen(config.core.secure ? config.core.port.secure : config.core.port.unsecure, () => {
      Logger.get(ZiplineServer).info('Started server on port ' + String(config.core.secure ? config.core.port.secure : config.core.port.unsecure));
    })
  }
}
