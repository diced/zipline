import * as bodyParser from 'body-parser';
import { Server } from '@overnightjs/core';
import { Connection } from 'typeorm';
import { ORMHandler } from '.';
import Logger from '@ayanaware/logger';
import config from '../config.json';
import * as express from 'express';
import session from 'express-session';
import cookies from 'cookie-parser';
import { APIController } from './controllers/APIController';
import { IndexController } from './controllers/IndexController';

export class TypeXServer extends Server {

  constructor(orm: ORMHandler) {
    super();
    this.app.use(session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false
    }))
    this.app.use(cookies())
    this.app.set('view engine', 'ejs');
    this.app.use('/u', express.static('uploads'))
    this.app.use('/public', express.static('public'))
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.setupControllers(orm);
  }

  private setupControllers(orm: ORMHandler): void {
    const api = new APIController().set(orm);
    const index = new IndexController().set(orm);
    super.addControllers([index, api]);
  }

  public start(port: number): void {
    this.app.listen(port, () => {
      Logger.get(TypeXServer).info('Started server on port ' + port);
    })
  }
}