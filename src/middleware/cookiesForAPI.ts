import { Request, Response } from "express";
import config from '../../config.json';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, FORBIDDEN } from 'http-status-codes'
import { getConnection } from 'typeorm';
import { User } from "../entities/User";

export async function cookiesForAPI(req: Request, res: Response, next: any) {
    if (req.cookies.typex_user) {
        console.log(typeof req.cookies.typex_user);
        if (typeof req.cookies.typex_user !== 'string') return res.status(BAD_REQUEST).send({ code: BAD_REQUEST, message: "Please clear browser cookies." })
        if (req.cookies.typex_user === 0) req.session.user = {
            id: 0,
            username: 'administrator',
            password: config.administrator.password,
            token: config.administrator.authorization,
            administrator: true
        }
        else req.session.user = await getConnection().getRepository(User).findOne({ id: req.cookies.typex_user });
        if (!req.session.user) return res.status(INTERNAL_SERVER_ERROR).send({ code: INTERNAL_SERVER_ERROR, message: "The user that is logged in does not exist" })
    } else return res.status(FORBIDDEN).send({ code: FORBIDDEN, message: "Unauthorized" })
    return next();
}