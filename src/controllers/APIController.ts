import { BAD_REQUEST, FORBIDDEN } from "http-status-codes";
import {
  Controller,
  Middleware,
  Get,
  Post,
  Delete,
  Patch,
} from "@overnightjs/core";
import { Request, Response } from "express";
import { ORMHandler } from "..";
import {
  randomId,
  getImage,
  findFile,
  getShorten,
  hashPassword,
} from "../util";
import {
  createReadStream,
  createWriteStream,
  unlinkSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from "fs";
import { User } from "../entities/User";
import { sep } from "path";
import { cookiesForAPI } from "../middleware/cookiesForAPI";
import { DiscordWebhook } from "../structures/DiscordWebhook";
import { ImageUtil } from "../structures/ImageUtil";
import { ShortenUtil } from "../structures/ShortenUtil";
import { Note } from "../entities/Note";
import Logger from "@ayanaware/logger";
import multer from "multer";

if (!findFile("config.json", process.cwd())) {
  Logger.get("FS").error(
    `No config.json exists in the ${__dirname}, exiting...`
  );
  process.exit(1);
}

const config = JSON.parse(
  readFileSync(findFile("config.json", process.cwd()), "utf8")
);

const upload = multer({ dest: config.uploader.temp });

@Controller("api")
export class APIController {
  public orm: ORMHandler;

  @Post("upload")
  @Middleware(upload.single("file"))
  private async upload(req: Request, res: Response) {
    const users = await this.orm.repos.user.find({
      where: { token: req.headers["authorization"] },
    });
    if (!users[0])
      return res
        .status(FORBIDDEN)
        .json({ code: FORBIDDEN, message: "Unauthorized" });
    if (req.headers["authorization"] !== users[0].token)
      return res
        .status(FORBIDDEN)
        .json({ code: FORBIDDEN, message: "Unauthorized" });
    const user = users[0];
    const id = randomId(config.uploader.length);
    if (
      config.uploader.blacklistedExt.includes(
        req.file.originalname.split(".").pop()
      )
    )
      return res
        .status(BAD_REQUEST)
        .json({
          code: BAD_REQUEST,
          message: "The extension used in this file is blacklisted.",
        });
    const source = createReadStream(req.file.path);
    if (!existsSync(config.uploader.upload)) mkdirSync(config.uploader.upload);
    const destination = createWriteStream(
      `${config.uploader.upload}${sep}${id}.${req.file.originalname
        .split(".")
        .pop()}`
    );
    source.pipe(destination, { end: false });
    source.on("end", function () {
      unlinkSync(req.file.path);
    });
    const img = await getImage(
      this.orm,
      `${req.protocol}://${req.headers["host"]}${
        config.uploader.route
      }/${id}.${req.file.originalname.split(".").pop()}`,
      user.id
    );
    Logger.get("TypeX.Uploader").info(
      `New image uploaded ${img.url} (${img.id}) by ${user.username} (${user.id})`
    );
    if (config.discordWebhook.enabled)
      new DiscordWebhook(config.discordWebhook.url).sendImageUpdate(
        user,
        ImageUtil.parseURL(img.url),
        config
      );
    return res
      .status(200)
      .send(
        `${req.protocol}://${req.headers["host"]}${
          config.uploader.route
        }/${id}.${req.file.originalname.split(".").pop()}`
      );
  }

  @Post("shorten")
  private async shorten(req: Request, res: Response) {
    const users = await this.orm.repos.user.find({
      where: { token: req.headers["authorization"] },
    });
    if (!users[0])
      return res
        .status(FORBIDDEN)
        .json({ code: FORBIDDEN, message: "Unauthorized" });
    if (req.headers["authorization"] !== users[0].token)
      return res
        .status(FORBIDDEN)
        .json({ code: FORBIDDEN, message: "Unauthorized" });
    const user = users[0];
    const id = randomId(config.shortener.length);
    const shrt = await getShorten(
      this.orm,
      id,
      req.body.url,
      `${req.protocol}://${req.headers["host"]}${config.shortener.route}/${id}`,
      user.id
    );
    Logger.get("TypeX.Shortener").info(
      `New url shortened ${shrt.url} (${req.body.url}) (${shrt.id}) by ${user.username} (${user.id})`
    );
    if (config.discordWebhook.enabled)
      new DiscordWebhook(config.discordWebhook.url).sendShortenUpdate(
        user,
        shrt,
        ShortenUtil.parseURL(shrt.url),
        config
      );
    return res
      .status(200)
      .send(
        `${req.protocol}://${req.headers["host"]}${config.shortener.route}/${id}`
      );
  }

  @Post("note")
  private async note(req: Request, res: Response) {
    const users = await this.orm.repos.user.find({
      where: { token: req.headers["authorization"] },
    });
    if (!users[0])
      return res
        .status(FORBIDDEN)
        .json({ code: FORBIDDEN, message: "Unauthorized" });
    if (req.headers["authorization"] !== users[0].token)
      return res
        .status(FORBIDDEN)
        .json({ code: FORBIDDEN, message: "Unauthorized" });
    const user = users[0];
    const id = randomId(config.notes.length);
    const note = await this.orm.repos.note.save(
      new Note().set({
        key: id,
        user: user.id,
        content: req.body.content,
        expiration: req.body.expiration ? req.body.expiration : null,
      })
    );
    Logger.get("TypeX.Notes").info(
      `New note created ${note.id} and ${
        note.expriation
          ? `will expire in ${note.expriation},`
          : `will not expire,`
      } by ${user.username} (${user.id})`
    );
    // if (config.discordWebhook.enabled) new DiscordWebhook(config.discordWebhook.url).sendShortenUpdate(user, shrt, ShortenUtil.parseURL(shrt.url), config);
    return res
      .status(200)
      .send(
        `${req.protocol}://${req.headers["host"]}${config.notes.route}/${id}`
      );
  }

  @Get("users")
  @Middleware(cookiesForAPI)
  private async getUsers(req: Request, res: Response) {
    if (!req.session.user.administrator)
      return res
        .status(FORBIDDEN)
        .json({ code: FORBIDDEN, message: "Unauthorized" });
    try {
      let users = await this.orm.repos.user.find({ order: { id: "ASC" } });
      return res.status(200).json(users);
    } catch (e) {
      return res
        .status(BAD_REQUEST)
        .json({ error: "Could not create user: " + e.message });
    }
  }

  @Post("users")
  @Middleware(cookiesForAPI)
  private async createUser(req: Request, res: Response) {
    if (!req.session.user.administrator)
      return res
        .status(FORBIDDEN)
        .json({ code: FORBIDDEN, message: "Unauthorized" });
    const data = req.body;
    try {
      let user = await this.orm.repos.user.findOne({ username: data.username });
      if (user)
        return res
          .status(BAD_REQUEST)
          .json({ error: "Could not create user: user exists already" });
      user = await this.orm.repos.user.save(
        new User().set({
          username: data.username,
          password: hashPassword(data.password, config.core.saltRounds),
          administrator: data.administrator,
        })
      );
      Logger.get("TypeX.User.Create").info(
        `User ${user.username} (${user.id}) was created`
      );
      return res.status(200).json(user);
    } catch (e) {
      return res
        .status(BAD_REQUEST)
        .json({ error: "Could not create user: " + e.message });
    }
  }

  @Post("users/register")
  private async registerUser(req: Request, res: Response) {
    const data = req.body;
    if (!config.core.public)
      return res
        .status(BAD_REQUEST)
        .json({
          error:
            "This zipline server does not have public enabled, therefore can't create a user.",
        });
    try {
      let user = await this.orm.repos.user.findOne({ username: data.username });
      if (user)
        return res
          .status(BAD_REQUEST)
          .json({ error: "Could not create user: user exists already" });
      user = await this.orm.repos.user.save(
        new User().set({
          username: data.username,
          password: hashPassword(data.password, config.core.saltRounds),
          administrator: false,
        })
      );
      return res.status(200).json({ success: true });
    } catch (e) {
      return res
        .status(BAD_REQUEST)
        .json({ error: `Couldn't create user: ${e.message}` });
    }
  }

  @Patch("users/:id")
  @Middleware(cookiesForAPI)
  private async patchUser(req: Request, res: Response) {
    const data = req.body;
    if (!data.payload)
      return res
        .status(FORBIDDEN)
        .json({ code: BAD_REQUEST, message: "No payload specified." });
    if (data.payload === "USER_EDIT") {
      if (Number(req.params.id) !== Number(req.session.user.id))
        return res
          .status(FORBIDDEN)
          .json({ code: FORBIDDEN, message: "Unauthorized" });
      data.password = hashPassword(data.password, config.core.saltRounds);
      try {
        let user = await this.orm.repos.user.findOne({
          id: Number(req.params.id),
        });
        if (!user)
          return res
            .status(BAD_REQUEST)
            .json({ error: "Could not edit user: user doesnt exist" });
        this.orm.repos.user.update(
          { id: Number(req.params.id) },
          { username: data.username, password: data.password }
        );
        Logger.get("TypeX.User.Edit").info(
          `User ${user.username} (${user.id}) was edited`
        );
        return res.status(200).json(user);
      } catch (e) {
        return res
          .status(BAD_REQUEST)
          .json({ error: "Could not edit user: " + e.message });
      }
    } else if (data.payload === "USER_RESET_PASSWORD") {
      data.password = hashPassword(data.password, config.core.saltRounds);
      try {
        let user = await this.orm.repos.user.findOne({
          id: Number(req.params.id),
        });
        if (!user)
          return res
            .status(BAD_REQUEST)
            .json({ error: "Could not reset password: user doesnt exist" });
        this.orm.repos.user.update(
          { id: Number(req.params.id) },
          { password: data.password }
        );
        Logger.get("TypeX.User.Edit.ResetPassword").info(
          `User ${user.username} (${user.id}) had their password reset.`
        );
        return res.status(200).json(user);
      } catch (e) {
        return res
          .status(BAD_REQUEST)
          .json({ error: "Could not reset password: " + e.message });
      }
    } else if (data.payload === "USER_TOKEN_RESET") {
      try {
        let user = await this.orm.repos.user.findOne({
          id: req.session.user.id,
        });
        if (!user)
          return res
            .status(BAD_REQUEST)
            .json({ error: "Could not regen token: user doesnt exist" });
        user.token = randomId(config.core.userTokenLength);
        req.session.user = user;
        await this.orm.repos.user.save(user);
        Logger.get("TypeX.User.Token").info(
          `User ${user.username} (${user.id}) token was regenerated`
        );
        return res.status(200).json(user);
      } catch (e) {
        return res
          .status(BAD_REQUEST)
          .json({ error: "Could not regen token: " + e.message });
      }
    } else {
      console.log(data);
    }
  }

  @Delete("users/:id")
  @Middleware(cookiesForAPI)
  private async deleteUser(req: Request, res: Response) {
    if (!req.session.user.administrator)
      return res
        .status(FORBIDDEN)
        .json({ code: FORBIDDEN, message: "Unauthorized" });
    try {
      let user = await this.orm.repos.user.findOne({
        id: Number(req.params.id),
      });
      if (!user)
        return res
          .status(BAD_REQUEST)
          .json({ error: "Could not delete user: user doesnt exist" });
      this.orm.repos.user.delete({ id: Number(req.params.id) });
      Logger.get("TypeX.User.Delete").info(
        `User ${user.username} (${user.id}) was deleted`
      );
      return res.status(200).json(user);
    } catch (e) {
      return res
        .status(BAD_REQUEST)
        .json({ error: "Could not delete user: " + e.message });
    }
  }
  @Get("images")
  @Middleware(cookiesForAPI)
  private async allImages(req: Request, res: Response) {
    const all = await this.orm.repos.image.find({
      where: { user: req.session.user.id },
      order: { id: "ASC" },
    });
    return res.status(200).json(all);
  }

  @Get("images/statistics")
  @Middleware(cookiesForAPI)
  private async statistics(req: Request, res: Response) {
    const all = await this.orm.repos.image.find({
      where: { user: req.session.user.id },
      order: { id: "ASC" },
    });
    const totalViews =
      all.map((i) => i.views).length !== 0
        ? all.map((i) => i.views).reduce((a, b) => Number(a) + Number(b))
        : 0;
    const users = await this.orm.repos.user.find();
    const images = [];
    const views = [];
    for (const user of users) {
      const i = await this.orm.repos.image.find({
        where: { user: user.id },
        order: { views: "ASC" },
      });
      images.push({
        username: user.username,
        count: i.length,
      });
      views.push({
        username: user.username,
        count:
          i.map((i) => i.views).length !== 0
            ? i.map((i) => i.views).reduce((a, b) => Number(a) + Number(b))
            : 0,
      });
    }
    return res.status(200).json({
      totalViews,
      images: all.length,
      average: totalViews / all.length,
      table: {
        images: images.sort((a, b) => b.count - a.count),
        views: views.sort((a, b) => b.count - a.count),
      },
    });
  }

  @Delete("images/:id")
  @Middleware(cookiesForAPI)
  private async deleteImage(req: Request, res: Response) {
    try {
      let image = await this.orm.repos.image.findOne({
        id: Number(req.params.id),
      });
      if (!image)
        return res
          .status(BAD_REQUEST)
          .json({
            error: "Could not delete image: image doesnt exist in database",
          });
      this.orm.repos.image.delete({ id: Number(req.params.id) });
      const url = new URL(image.url);
      unlinkSync(`${config.uploader.upload}${sep}${url.pathname.slice(3)}`);
      Logger.get("TypeX.Images.Delete").info(
        `Image ${image.url} (${image.id}) was deleted from ${
          config.uploader.upload
        }${sep}${url.pathname.slice(3)}`
      );
      return res.status(200).json(image);
    } catch (e) {
      return res
        .status(BAD_REQUEST)
        .json({ error: "Could not delete image: " + e.message });
    }
  }

  @Get("images/:id")
  @Middleware(cookiesForAPI)
  private async imagesUser(req: Request, res: Response) {
    const all = await this.orm.repos.image.find({
      where: { id: req.params.id },
      order: { id: "ASC" },
    });
    return res.status(200).json(all);
  }

  @Get("images/user/pages")
  @Middleware(cookiesForAPI)
  private async pagedUser(req: Request, res: Response) {
    const all = await this.orm.repos.image.find({
      where: { user: req.session.user.id },
      order: { id: "ASC" },
    });
    const paged = [];
    const pagedNums = [];
    while (all.length) paged.push(all.splice(0, 25));
    for (let x = 0; x < paged.length; x++) pagedNums.push(x);
    if (!req.query.page) return res.status(200).json({ pagedNums });
    else return res.status(200).json({ page: paged[Number(req.query.page)] });
  }

  @Get("shortens")
  @Middleware(cookiesForAPI)
  private async allShortens(req: Request, res: Response) {
    const all = await this.orm.repos.shorten.find({
      where: { user: req.session.user.id },
      order: { id: "ASC" },
    });
    return res.status(200).json(all);
  }

  @Get("shortens/:id")
  @Middleware(cookiesForAPI)
  private async getShorten(req: Request, res: Response) {
    const all = await this.orm.repos.shorten.find({
      where: { user: req.session.user.id, id: Number(req.params.id) },
      order: { id: "ASC" },
    });
    return res.status(200).json(all);
  }

  @Get("notes")
  @Middleware(cookiesForAPI)
  private async allNotes(req: Request, res: Response) {
    const all = await this.orm.repos.note.find({
      where: { user: req.session.user.id },
      order: { id: "ASC" },
    });
    return res.status(200).json(all);
  }

  @Get("notes/:id")
  @Middleware(cookiesForAPI)
  private async getNote(req: Request, res: Response) {
    const all = await this.orm.repos.note.find({
      where: { user: req.session.user.id, id: Number(req.params.id) },
      order: { id: "ASC" },
    });
    return res.status(200).json(all);
  }

  @Get("stats")
  private async getStats(req: Request, res: Response) {
    const memory = process.memoryUsage();
    const views: number = (await this.orm.repos.image.find())
      .map((a) => a.views)
      .reduce((a, b) => Number(a) + Number(b), 0);
    const clicks: number = (await this.orm.repos.shorten.find())
      .map((a) => a.clicks)
      .reduce((a, b) => Number(a) + Number(b), 0);
    return res.status(200).json({
      memory,
      uploadedStatistics: {
        views,
        clicks,
      },
      count: {
        image: await this.orm.repos.image.count(),
        note: await this.orm.repos.note.count(),
        shorten: await this.orm.repos.shorten.count(),
        user: await this.orm.repos.user.count(),
      },
      zipline: {
        version: JSON.parse(
          readFileSync(findFile("package.json", process.cwd()), "utf8")
        ).version,
        database: this.orm.connection.options.type,
      },
    });
  }

  public set(orm: ORMHandler) {
    this.orm = orm;
    return this;
  }
}
