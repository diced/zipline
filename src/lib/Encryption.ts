import aes from 'crypto-js/aes'
import { compareSync, hashSync } from 'bcrypt';
import { Configuration } from './Config';

const config = Configuration.readConfig();
if (!config) process.exit(0);

export function encrypt(data: any) {
  return aes.encrypt(JSON.stringify(data), config.core.secret).toString();
}

export function decrypt(data: string) {
  return aes.decrypt(data, config.core.secret).toString();
}

export function encryptPassword(pass: string) {
  return hashSync(pass, 10);
}

export function checkPassword(will: string, equal: string) {
  return compareSync(will, equal);
}