import { Request, Response } from "express";
import config from '../../config.json';
import { getConnection } from 'typeorm';
import { User } from "../entities/User";

export async function cookies(req: Request, res: Response, next: any) {
    if (req.cookies.typex_user) {
        if (typeof req.cookies.typex_user !== 'string') return res.send('Please clear your browser cookies and refresh this page.')
        if (Number(req.cookies.typex_user) === 0) {
            req.session.user = {
                id: 0,
                username: 'administrator',
                password: config.administrator.password,
                administrator: true
            }
        } else req.session.user = await getConnection().getRepository(User).findOne({ id: req.cookies.typex_user });
        if (!req.session.user) {
            res.clearCookie('typex_user');
            req.session.user = null;
            return res.redirect('/login')
        }
    } else return res.redirect('/login');
    return next();
}