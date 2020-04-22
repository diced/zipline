import { Request, Response } from "express";
import { FORBIDDEN, UNAUTHORIZED } from "http-status-codes";
import config from '../../config.json';

export default function (req: Request, res: Response, next: any) {
  if (req.isAuthenticated()) return next();
  return res.redirect('/');
}