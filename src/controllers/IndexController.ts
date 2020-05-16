import { Controller, Middleware, Get, Post } from '@overnightjs/core';
import { Request, Response } from 'express';
import { ORMHandler } from '..';
import { findFile, checkPassword } from '../util';
import { readFileSync } from 'fs'
import multer from 'multer';
import { cookies } from '../middleware/cookies';
import Logger from '@ayanaware/logger';
import { ShortenUtil } from '../structures/ShortenUtil';
import { ImageUtil } from '../structures/ImageUtil';

if (!findFile('config.json', process.cwd())) {
  Logger.get('FS').error(`No config.json exists in the ${__dirname}, exiting...`)
  process.exit(1);
}

const config = JSON.parse(readFileSync(findFile('config.json', process.cwd()), 'utf8'))

@Controller('')
export class IndexController {
  public orm: ORMHandler;

  @Get('')
  @Middleware(cookies)
  private async index(req: Request, res: Response) {
    const images = await this.orm.repos.image.find({ where: { user: req.session.user.id } });
    const users = await this.orm.repos.user.find({ order: { id: 'ASC' } });
    const userImages = [];
    for (let i = 0; i < users.length; i++) {
      userImages[i] = await (await this.orm.repos.image.find({where:{user:users[i].id}})).length
    }
    return res.render('index', { user: req.session.user, images, users, userImages, config })
  }

  @Get('login')
  private async login(req: Request, res: Response) {
    if (req.session.user || req.cookies.typex_user) return res.redirect('/');
    return res.status(200).render('login', { failed: false, config })
  }

  @Get('logout')
  private async logout(req: Request, res: Response) {
    Logger.get('TypeX.Auth').info(`User ${req.session.user?.username} (${req.session.user?.id}) logged out`)
    req.session.user = null;
    res.clearCookie('typex_user');
    res.redirect('/login');
  }

  @Post('login')
  private async postLogin(req: Request, res: Response) {
    if (req.session.user || req.cookies.typex_user) return res.redirect('/');
    if (req.body.username === 'administrator' && req.body.password === config.administrator.password) {
      //@ts-ignore
      req.session.user = {
        id: 0,
        username: 'administrator',
        password: config.administrator.password,
        administrator: true
      }
      res.cookie('typex_user', req.session.user.id, { maxAge: 1036800000 });
      Logger.get('TypeX.Auth').info(`Administrator has logged in from IP ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`)
      return res.redirect('/')
    }
    const user = await this.orm.repos.user.findOne({ where: { username: req.body.username } });
    if (!user) return res.status(200).render('login', { failed: true, config });
    if (!checkPassword(req.body.password, user.password)) return res.status(200).render('login', { failed: true, config })
    req.session.user = user;
    res.cookie('typex_user', req.session.user.id, { maxAge: 1036800000 });
    return res.redirect('/');
  }

  @Get(`${config.shorten.route.slice(1)}/:id`)
  private async getShorten(req: Request, res: Response) {
    const shorten = await this.orm.repos.shorten.findOne({ key: req.params.id });
    if (!shorten) return res.render('404');
    return res.redirect(shorten.origin)
  }

  public set(orm: ORMHandler) {
    this.orm = orm;
    return this;
  }
}