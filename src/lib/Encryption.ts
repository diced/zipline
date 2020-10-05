import aes from 'crypto-js/aes'
import { compareSync, hashSync } from 'bcrypt';
import { Configuration } from './Config';

const config = Configuration.readConfig();
if (!config) process.exit(0);

export function createToken() {
  return aes.encrypt(Math.random().toString(36).substr(2) + Date.now(), config.core.secret).toString();
}

export function encryptPassword(pass: string) {
  return hashSync(pass, 10);
}

export function checkPassword(will: string, equal: string) {
  return compareSync(will, equal);
}