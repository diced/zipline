import Logger from "@ayanaware/logger";
import { Request, Response } from "express";
import { getConnection } from "typeorm";
import { User } from "../entities/User";
import { findFile } from "../util";
import { readFileSync } from "fs";

if (!findFile("config.json", process.cwd())) {
  Logger.get("FS").error(`No config.json exists in ${__dirname}, exiting...`);
  process.exit(1);
}

const config = JSON.parse(
  readFileSync(findFile("config.json", process.cwd()), "utf8")
);

export async function cookies(req: Request, res: Response, next: any) {
  if (req.cookies.typex_user) {
    if (typeof req.cookies.typex_user !== "string")
      return res.send(
        "Please clear your browser cookies and refresh this page."
      );
    if (Number(req.cookies.typex_user) === 0) {
      req.session.user = {
        id: 0,
        username: "administrator",
        password: config.core.adminPassword,
        administrator: true,
      };
    } else
      req.session.user = await getConnection()
        .getRepository(User)
        .findOne({ id: req.cookies.typex_user });
    if (!req.session.user) {
      res.clearCookie("typex_user");
      req.session.user = null;
      return res.redirect("/login");
    }
  } else return res.redirect("/login");
  return next();
}
