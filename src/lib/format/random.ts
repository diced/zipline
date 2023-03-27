import { randomChars } from 'lib/util';
import config from 'lib/config';

export default function random() {
  return randomChars(config.uploader.length);
}
