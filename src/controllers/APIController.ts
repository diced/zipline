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
import { cookiesForAPI } from '../middleware/cookiesForAPI';
const upload = multer({ dest: config.upload.tempDir });

@Controller('api')
export class APIController {
  public orm: ORMHandler;

  @Post('upload')
  @Middleware(upload.single('file'))
  private async upload(req: Request, res: Response) {
    if (req.headers['authorization'] === config.administrator.authorization) return res.status(BAD_REQUEST).json({ code: BAD_REQUEST, message: "You can't upload files with the administrator account." })
    const users = await this.orm.repos.user.find({ where: { token: req.headers['authorization'] } });
    if (!users[0]) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: "Unauthorized" })
    if (req.headers['authorization'] !== users[0].token) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: "Unauthorized" })
    const user = users[0];
    const file = req.file;
    const id = randomId(config.upload.fileLength);
    const extension = getExtension(file.mimetype);
    const source = createReadStream(file.path);
    if (!existsSync(config.upload.uploadDir)) mkdirSync(config.upload.uploadDir);
    const destination = createWriteStream(`${config.upload.uploadDir}${sep}${id}.${extension}`);
    source.pipe(destination, { end: false });
    source.on("end", function () {
      unlinkSync(file.path);
    });
    getImage(this.orm, `${req.protocol}://${req.headers['host']}/u/${id}.${extension}`, user.id)
    return res.status(200).send(`${req.protocol}://${req.headers['host']}/u/${id}.${extension}`)
  }

  @Post('user')
  @Middleware(cookiesForAPI)
  private async newUser(req: Request, res: Response) {
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
  @Middleware(cookiesForAPI)
  private async patchUser(req: Request, res: Response) {
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
  @Middleware(cookiesForAPI)
  private async deleteUser(req: Request, res: Response) {
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
  @Middleware(cookiesForAPI)
  private async postToken(req: Request, res: Response) {
    try {
      let user = await this.orm.repos.user.findOne({ id: req.session.user.id })
      if (!user) return res.status(BAD_REQUEST).json({ error: "Could not regen token: user doesnt exist" })
      user.token = randomId(config.user.tokenLength);
      req.session.user = user;
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

  @Get('images')
  @Middleware(cookiesForAPI)
  private async imagesUser(req: Request, res: Response) {
    const userId = req.query.user;
    const all = await this.orm.repos.image.find({ where: { user: userId }, order: { id: 'ASC' }});
    return res.status(200).json(all)
  }

  @Delete('images')
  @Middleware(cookiesForAPI)
  private async deleteImage(req: Request, res: Response) {
    const img = req.query.image;
    try {
      let image = await this.orm.repos.image.findOne({ id: Number(img) })
      if (!image) return res.status(BAD_REQUEST).json({ error: "Could not delete image: image doesnt exist in database" })
      this.orm.repos.image.delete({ id: Number(img) });
      const url = new URL(image.url);
      unlinkSync(`${config.upload.uploadDir}${sep}${url.pathname.slice(3)}`);
      return res.status(200).json(image);
    } catch (e) {
      return res.status(BAD_REQUEST).json({ error: "Could not delete user: " + e.message })
    }
  }


  public set(orm: ORMHandler) {
    this.orm = orm;
    return this;
  }
}