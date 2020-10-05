import bcrypt from "bcrypt";
import { ORMHandler } from ".";
import { User } from "./entities/User";
import { Image } from "./entities/Image";
import { statSync, readdirSync } from "fs";
import { join, basename } from "path";
import { Shorten } from "./entities/Shorten";

export function randomId(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++)
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  return result;
}

export function renderTemplate(res, req, template, data = {}) {
  const baseData = {
    path: req.path,
    user: req.isAuthenticated() ? req.user : null,
    auth: req.isAuthenticated(),
  };
  res.render(template, Object.assign(baseData, data));
}

export async function getUser(
  orm: ORMHandler,
  username: string,
  password: string,
  administrator: boolean = false
) {
  const user = await orm.repos.user.findOne({ username });
  if (!user)
    return orm.repos.user.save(
      new User().set({ username, password, administrator })
    );
  return user;
}

export async function getImage(orm: ORMHandler, url: string, user: number) {
  const image = await orm.repos.image.findOne({ url, user });
  if (!image) return orm.repos.image.save(new Image().set({ url, user }));
  return image;
}

export async function getShorten(
  orm: ORMHandler,
  key: string,
  origin: string,
  url: string,
  user: number
) {
  const image = await orm.repos.shorten.findOne({ key });
  if (!image)
    return orm.repos.shorten.save(
      new Shorten().set({ key, origin, url, user })
    );
  return image;
}

export function findFile(file, directory) {
  const result = [];
  (function read(dir) {
    const files = readdirSync(dir);
    for (const file of files) {
      const filepath = join(dir, file);
      if (
        file !== ".git" &&
        file !== "node_modules" &&
        statSync(filepath).isDirectory()
      ) {
        read(filepath);
      } else {
        result.push(filepath);
      }
    }
  })(directory);
  for (const f of result) {
    const base = basename(f);
    if (base === file) return f;
  }
  return null;
}

export function checkPassword(pass: string, hash: string): boolean {
  return bcrypt.compareSync(pass, hash);
}

export function hashPassword(pass: string, saltRounds: number): string {
  // console.log(bcrypt.hashSync(pass,saltRounds));
  return bcrypt.hashSync(pass, saltRounds);
}
