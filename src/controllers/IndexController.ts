import { OK, BAD_REQUEST, FORBIDDEN } from 'http-status-codes';
import { Controller, Middleware, Get, Post, Put, Delete } from '@overnightjs/core';
import { Request, Response } from 'express';
import config from '../../config.json';
import { ORMHandler } from '..';
import { randomId, getUser, getImage } from '../util';
import { createReadStream, createWriteStream, unlinkSync, existsSync, mkdirSync } from 'fs'
import multer from 'multer'
import { getExtension } from 'mime';
import { User } from '../entities/User';
const upload = multer({ dest: 'temp/' });

@Controller('')
export class IndexController {
  public orm: ORMHandler;

  @Get('')
  private async index(req: Request, res: Response) {
    if (req.cookies.typex_user) req.session.user = req.cookies.typex_user;
    if (!req.session.user) return res.redirect('/login');
    const images = await this.orm.repos.image.find({ where: { user: req.session.user.id } });
    const users = await this.orm.repos.user.find({ order: { id: 'ASC' } });
    return res.render('index', { user: req.session.user, images, users, config })
  }

  @Get('login')
  private async login(req: Request, res: Response) {
    if (req.cookies.typex_user) req.session.user = req.cookies.typex_user;
    if (req.session.user) return res.redirect('/');
    return res.status(200).render('login', { password: true, username: true, config })
  }

  @Get('logout')
  private async logout(req: Request, res: Response) {
    if (req.cookies.typex_user) req.session.user = req.cookies.typex_user;
    if (!req.session.user) return res.redirect('/')
    req.session.user = null;
    res.clearCookie('typex_user');
    res.redirect('/login');
  }

  @Post('login')
  private async postLogin(req: Request, res: Response) {
    if (req.cookies.typex_user) req.session.user = req.cookies.typex_user;
    if (req.session.user) return res.redirect('/');
    if (req.body.username == 'administrator' && req.body.password === config.administrator.password) {
      //@ts-ignore
      req.session.user = {
        id: 0,
        username: 'administrator',
        password: config.administrator.password,
        token: config.administrator.authorization,
        administrator: true
      }
      res.cookie('typex_user', req.session.user, { maxAge: 1036800000 });
      return res.redirect('/')
    }
    const user = await this.orm.repos.user.findOne({ where: { username: req.body.username } });
    if (!user) return res.status(200).render('login', { username: false, password: false })
    if (req.body.password !== user.password) return res.status(200).render('login', { password: false, username: false })
    req.session.user = user;
    res.cookie('typex_user', req.session.user, { maxAge: 1036800000 });
    return res.redirect('/')
  }

  public set(orm: ORMHandler) {
    this.orm = orm;
    return this;
  }
}