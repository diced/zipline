import config from 'lib/config';
import { inspect } from 'util';

console.log(inspect(config, { depth: Infinity, colors: true }));
