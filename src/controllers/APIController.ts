import { BAD_REQUEST, FORBIDDEN } from 'http-status-codes';
import { Controller, Middleware, Get, Post, Delete, Patch } from '@overnightjs/core';
import { Request, Response } from 'express';
import { ORMHandler } from '..';
import { randomId, getImage, findFile, getShorten, hashPassword } from '../util';
import { createReadStream, createWriteStream, unlinkSync, existsSync, mkdirSync, readFileSync } from 'fs'
import multer from 'multer'
import { getExtension } from 'mime';
import { User } from '../entities/User';
import { sep } from 'path';
import { cookiesForAPI } from '../middleware/cookiesForAPI';
import Logger from '@ayanaware/logger';
import { DiscordWebhook } from '../structures/DiscordWebhook';
import { ImageUtil } from '../structures/ImageUtil';
import { ShortenUtil } from '../structures/ShortenUtil';

if (!findFile('config.json', process.cwd())) {
  Logger.get('FS').error(`No config.json exists in the ${__dirname}, exiting...`)
  process.exit(1);
}

const config = JSON.parse(readFileSync(findFile('config.json', process.cwd()), 'utf8'))

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
    const img = await getImage(this.orm, `${config.site.returnProtocol}://${req.headers['host']}${config.upload.route}/${id}.${extension}`, user.id)
    Logger.get('TypeX.Uploader').info(`New image uploaded ${img.url} (${img.id}) by ${user.username} (${user.id})`)
    if (config.discordWebhook.enabled) new DiscordWebhook(config.discordWebhook.url).sendImageUpdate(user, ImageUtil.parseURL(img.url), config);
    return res.status(200).send(`${config.site.returnProtocol}://${req.headers['host']}${config.upload.route}/${id}.${extension}`)
  }

  @Post('shorten')
  private async shorten(req: Request, res: Response) {
    if (req.headers['authorization'] === config.administrator.authorization) return res.status(BAD_REQUEST).json({ code: BAD_REQUEST, message: "You can't upload files with the administrator account." })
    const users = await this.orm.repos.user.find({ where: { token: req.headers['authorization'] } });
    if (!users[0]) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: "Unauthorized" })
    if (req.headers['authorization'] !== users[0].token) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: "Unauthorized" })
    const user = users[0];
    const id = randomId(config.shorten.idLength)
    const shrt = await getShorten(this.orm, id, req.body.url, `${config.site.returnProtocol}://${req.headers['host']}${config.shorten.route}/${id}`, user.id);
    Logger.get('TypeX.Shortener').info(`New url shortened ${shrt.url} (${req.body.url}) (${shrt.id}) by ${user.username} (${user.id})`)
    if (config.discordWebhook.enabled) new DiscordWebhook(config.discordWebhook.url).sendShortenUpdate(user, shrt, ShortenUtil.parseURL(shrt.url), config);
    return res.status(200).send(`${config.site.returnProtocol}://${req.headers['host']}${config.shorten.route}/${id}`)
  }

  @Get('users')
  @Middleware(cookiesForAPI)
  private async getUsers(req: Request, res: Response) {
    if (!req.session.user.administrator) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: 'Unauthorized' });
    const data = req.body;
    try {
      let users = await this.orm.repos.user.find({ order: { id: 'ASC' } })
      return res.status(200).json(users);
    } catch (e) {
      return res.status(BAD_REQUEST).json({ error: "Could not create user: " + e.message })
    }
  }

  @Post('users')
  @Middleware(cookiesForAPI)
  private async createUser(req: Request, res: Response) {
    if (!req.session.user.administrator) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: 'Unauthorized' });
    const data = req.body;
    try {
      let user = await this.orm.repos.user.findOne({ username: data.username })
      if (user) return res.status(BAD_REQUEST).json({ error: "Could not create user: user exists already" })
      user = await this.orm.repos.user.save(new User().set({ username: data.username, password: hashPassword(data.password, config.saltRounds), administrator: data.administrator }))
      Logger.get('TypeX.User.Create').info(`User ${user.username} (${user.id}) was created`)
      return res.status(200).json(user);
    } catch (e) {
      return res.status(BAD_REQUEST).json({ error: "Could not create user: " + e.message })
    }
  }

  @Patch('users/:id')
  @Middleware(cookiesForAPI)
  private async patchUser(req: Request, res: Response) {
    const data = req.body;
    if (!data.payload) return res.status(FORBIDDEN).json({ code: BAD_REQUEST, message: 'No payload specified.' });
    if (data.payload === 'USER_EDIT') {
      if (Number(req.params.id) !== Number(req.session.user.id)) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: 'Unauthorized' });
      data.password = hashPassword(data.password, config.saltRounds)
      try {
        let user = await this.orm.repos.user.findOne({ id: Number(req.params.id) })
        if (!user) return res.status(BAD_REQUEST).json({ error: "Could not edit user: user doesnt exist" })
        this.orm.repos.user.update({ id: Number(req.params.id) }, { username: data.username, password: data.password });
        Logger.get('TypeX.User.Edit').info(`User ${user.username} (${user.id}) was edited`)
        return res.status(200).json(user);
      } catch (e) {
        return res.status(BAD_REQUEST).json({ error: "Could not edit user: " + e.message })
      }
    } else if (data.payload === 'USER_RESET_PASSWORD') {
      data.password = hashPassword(data.password, config.saltRounds)
      try {
        let user = await this.orm.repos.user.findOne({ id: Number(req.params.id) })
        if (!user) return res.status(BAD_REQUEST).json({ error: "Could not reset password: user doesnt exist" })
        this.orm.repos.user.update({ id: Number(req.params.id) }, { password: data.password });
        Logger.get('TypeX.User.Edit.ResetPassword').info(`User ${user.username} (${user.id}) had their password reset.`)
        return res.status(200).json(user);
      } catch (e) {
        return res.status(BAD_REQUEST).json({ error: "Could not reset password: " + e.message })
      }
    } else if (data.payload === 'USER_TOKEN_RESET') {
      try {
        let user = await this.orm.repos.user.findOne({ id: req.session.user.id })
        if (!user) return res.status(BAD_REQUEST).json({ error: "Could not regen token: user doesnt exist" })
        user.token = randomId(config.user.tokenLength);
        req.session.user = user;
        await this.orm.repos.user.save(user);
        Logger.get('TypeX.User.Token').info(`User ${user.username} (${user.id}) token was regenerated`)
        return res.status(200).json(user);
      } catch (e) {
        return res.status(BAD_REQUEST).json({ error: "Could not regen token: " + e.message })
      }
    } else {
      console.log(data);
    }
  }

  @Delete('users/:id')
  @Middleware(cookiesForAPI)
  private async deleteUser(req: Request, res: Response) {
    if (!req.session.user.administrator) return res.status(FORBIDDEN).json({ code: FORBIDDEN, message: 'Unauthorized' });
    try {
      let user = await this.orm.repos.user.findOne({ id: Number(req.params.id) })
      if (!user) return res.status(BAD_REQUEST).json({ error: "Could not delete user: user doesnt exist" })
      this.orm.repos.user.delete({ id: Number(req.params.id) });
      Logger.get('TypeX.User.Delete').info(`User ${user.username} (${user.id}) was deleted`)
      return res.status(200).json(user);
    } catch (e) {
      return res.status(BAD_REQUEST).json({ error: "Could not delete user: " + e.message })
    }
  }
  @Get('images')
  @Middleware(cookiesForAPI)
  private async allImages(req: Request, res: Response) {
    const all = await this.orm.repos.image.find({ where: { user: req.session.user.id }, order: { id: 'ASC' } });
    return res.status(200).json(all);
  }

  @Get('images/statistics')
  @Middleware(cookiesForAPI)
  private async statistics(req: Request, res: Response) {
    const all = await this.orm.repos.image.find({ where: { user: req.session.user.id }, order: { id: 'ASC' } });
    const totalViews = all.map(i=>i.views).length !== 0 ? all.map(i=>i.views).reduce((a,b) => Number(a)+Number(b)) : 0
    const users = await this.orm.repos.user.find();
    const images = [];
    const views = [];
    for (const user of users) {
      const i = await this.orm.repos.image.find({where:{user:user.id}, order: {id:'ASC'}});
      images.push({ 
        username: user.username,
        count: i.length
      });
      views.push({
        username: user.username,
        count: i.map(i=>i.views).length !== 0 ? i.map(i=>i.views).reduce((a,b) => Number(a)+Number(b)) : 0
      })
    }
    return res.status(200).json({
      totalViews,
      images: all.length,
      average: totalViews/all.length,
      table: {
        images: images.sort((a,b) => a-b),
        views: views.sort((a,b) => a-b)
      }
    });
    
  }

  @Delete('images/:id')
  @Middleware(cookiesForAPI)
  private async deleteImage(req: Request, res: Response) {
    try {
      let image = await this.orm.repos.image.findOne({ id: Number(req.params.id) })
      if (!image) return res.status(BAD_REQUEST).json({ error: "Could not delete image: image doesnt exist in database" })
      this.orm.repos.image.delete({ id: Number(req.params.id) });
      const url = new URL(image.url);
      unlinkSync(`${config.upload.uploadDir}${sep}${url.pathname.slice(3)}`);
      Logger.get('TypeX.Images.Delete').info(`Image ${image.url} (${image.id}) was deleted from ${config.upload.uploadDir}${sep}${url.pathname.slice(3)}`)
      return res.status(200).json(image);
    } catch (e) {
      return res.status(BAD_REQUEST).json({ error: "Could not delete image: " + e.message })
    }
  }

  @Get('images/:id')
  @Middleware(cookiesForAPI)
  private async imagesUser(req: Request, res: Response) {
    const all = await this.orm.repos.image.find({ where: { id: req.params.id }, order: { id: 'ASC' } });
    return res.status(200).json(all);
  }
  
  @Get('images/user/pages')
  @Middleware(cookiesForAPI)
  private async pagedUser(req: Request, res: Response) {
    const all = await this.orm.repos.image.find({ where: { user: req.session.user.id }, order: { id: 'ASC' } });
    const paged = [];
    const pagedNums = [];
    while (all.length) paged.push(all.splice(0, 25));
    for (let x = 0; x < paged.length; x++) pagedNums.push(x);
    if (!req.query.page) return res.status(200).json({pagedNums});
    else return res.status(200).json({page: paged[Number(req.query.page)]});
  }

  @Get('shortens')
  @Middleware(cookiesForAPI)
  private async allShortens(req: Request, res: Response) {
    const all = await this.orm.repos.shorten.find({ where: { user: req.session.user.id }, order: { id: 'ASC' } });
    return res.status(200).json(all);
  }

  @Get('shortens/:id')
  @Middleware(cookiesForAPI)
  private async getShorten(req: Request, res: Response) {
    const all = await this.orm.repos.shorten.find({ where: { user: req.session.user.id, id: Number(req.params.id) }, order: { id: 'ASC' } });
    return res.status(200).json(all);
  }

  public set(orm: ORMHandler) {
    this.orm = orm;
    return this;
  }
}