import Logger from "@ayanaware/logger";
import { Request, Response } from "express";
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, FORBIDDEN } from 'http-status-codes'
import { getConnection } from 'typeorm';
import { Users } from "../entities/User";
import { findFile } from "../util";
import { readFileSync } from 'fs';

if (!findFile('config.json', process.cwd())) {
  Logger.get('FS').error(`No config.json exists in ${__dirname}, exiting...`)
  process.exit(1);
}

const config = JSON.parse(readFileSync(findFile('config.json', process.cwd()), 'utf8'))

export async function cookiesForAPI(req: Request, res: Response, next: any) {
    if (req.cookies.typex_user) {
        if (typeof req.cookies.typex_user !== 'string') return res.status(BAD_REQUEST).send({ code: BAD_REQUEST, message: "Please clear browser cookies." })
        if (Number(req.cookies.typex_user) === 0) req.session.user = {
            id: 0,
            username: 'administrator',
            password: config.core.adminPassword,
            administrator: true
        }
        else req.session.user = await getConnection().getRepository(Users).findOne({ id: req.cookies.typex_user });
        if (!req.session.user) return res.status(INTERNAL_SERVER_ERROR).send({ code: INTERNAL_SERVER_ERROR, message: "The user that is logged in does not exist" })
    } else return res.status(FORBIDDEN).send({ code: FORBIDDEN, message: "Unauthorized" })
    return next();
}
