import { Request, Response } from 'express';
import { ORMHandler } from '.';
import { User } from './entities/User';
import { Image } from './entities/Image';



export function randomId(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}


export function renderTemplate(res, req, template, data = {}) {
  const baseData = {
    path: req.path,
    user: req.isAuthenticated() ? req.user : null,
    auth: req.isAuthenticated()
  };
  res.render(template, Object.assign(baseData, data));
}

export async function getUser(orm: ORMHandler, username: string, password: string, administrator: boolean = false) {
  const user = await orm.repos.user.findOne({ username });
  if (!user) return orm.repos.user.save(new User().set({ username, password, administrator }));
  return user;
}

export async function getImage(orm: ORMHandler, url: string, user: number) {
  const image = await orm.repos.image.findOne({ url, user });
  if (!image) return orm.repos.image.save(new Image().set({ url, user }));
  return image;
}