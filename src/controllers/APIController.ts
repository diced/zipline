import { OK, BAD_REQUEST, FORBIDDEN } from 'http-status-codes';
import { Controller, Middleware, Get, Post, Put, Delete, Patch } from '@overnightjs/core';
import { Request, Response } from 'express';
import config from '../../config.json';
import { ORMHandler } from '..';
import { randomId, getUser, getImage } from '../util';
import { createReadStream, createWriteStream, unlinkSync, existsSync, mkdirSync } from 'fs'
import multer from 'multer'
import { getExtension } from 'mime';
import { User } from '../entities/User';
import { sep } from 'path';
const upload = multer({ dest: config.upload.tempDir });

@Controller('api')
export class APIController {
  public orm: ORMHandler;

  @Post('upload')
  @Middleware(upload.single('file'))
  private async upload(req: Request, res: Response) {
    if (req.headers['authorization'] !== (await this.orm.repos.user.find({ where: { token: req.headers['authorization'] } }))[0].token) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: "Unauthorized" })
    const user = (await this.orm.repos.user.find({ where: { token: req.headers['authorization'] } }))[0];
    const file = req.file;
    const id = randomId(5);
    const extension = getExtension(file.mimetype);
    const source = createReadStream(file.path);
    if (!existsSync(config.upload.uploadDir)) mkdirSync(config.upload.uploadDir);
    const destination = createWriteStream(`${config.upload.uploadDir}${sep}${id}.${extension}`);
    source.pipe(destination, { end: false });
    source.on("end", function () {
      unlinkSync(file.path);
    });
    getImage(this.orm, `${req.protocol}://${config.site.domain}/u/${id}.${extension}`, user.id)
    return res.status(200).send(`${req.protocol}://${config.site.domain}/u/${id}.${extension}`)
  }

  @Post('user')
  private async newUser(req: Request, res: Response) {
    if (req.cookies.typex_user) req.session.user = req.cookies.typex_user;
    if (!req.session.user) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: 'Unauthorized' });
    if (!req.session.user.administrator) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: 'Unauthorized' });
    const data = req.body;
    try {
      let user = await this.orm.repos.user.findOne({ username: data.username })
      if (user) return res.status(BAD_REQUEST).json({ error: "Could not create user: user exists already" })
      user = await this.orm.repos.user.save(new User().set({ username: data.username, password: data.password, administrator: data.administrator }))
      return res.status(200).json(user);
    } catch (e) {
      return res.status(BAD_REQUEST).json({ error: "Could not create user: " + e.message })
    }
  }

  @Patch('user')
  private async patchUser(req: Request, res: Response) {
    if (req.cookies.typex_user) req.session.user = req.cookies.typex_user;
    if (!req.session.user) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: 'Unauthorized' });
    const data = req.body;
    try {
      let user = await this.orm.repos.user.findOne({ id: req.session.user.id })
      if (!user) return res.status(BAD_REQUEST).json({ error: "Could not edit user: user doesnt exist" })
      this.orm.repos.user.update({ id: req.session.user.id }, data)
      return res.status(200).json(user);
    } catch (e) {
      return res.status(BAD_REQUEST).json({ error: "Could not edit user: " + e.message })
    }
  }

  @Delete('user')
  private async deleteUser(req: Request, res: Response) {
    if (req.cookies.typex_user) req.session.user = req.cookies.typex_user;
    if (!req.session.user) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: 'Unauthorized' });
    const q = req.query.user;
    try {
      let user = await this.orm.repos.user.findOne({ id: Number(q) || req.session.user.id })
      if (!user) return res.status(BAD_REQUEST).json({ error: "Could not delete user: user doesnt exist" })
      this.orm.repos.user.delete({ id: Number(q) || req.session.user.id })
      return res.status(200).json(user);
    } catch (e) {
      return res.status(BAD_REQUEST).json({ error: "Could not delete user: " + e.message })
    }
  }

  @Post('token')
  private async postToken(req: Request, res: Response) {
    if (!req.session.user) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: 'Unauthorized' });
    const data = req.body;
    try {
      let user = await this.orm.repos.user.findOne({ id: req.session.user.id })
      if (!user) return res.status(BAD_REQUEST).json({ error: "Could not regen token: user doesnt exist" })
      user.token = randomId(32);
      await this.orm.repos.user.save(user);
      return res.status(200).json(user);
    } catch (e) {
      return res.status(BAD_REQUEST).json({ error: "Could not regen token: " + e.message })
    }
  }

  @Get('images')
  private async images(req: Request, res: Response) {
    const all = await this.orm.repos.image.find();
    return res.status(200).json(all)
  }

  public set(orm: ORMHandler) {
    this.orm = orm;
    return this;
  }
}