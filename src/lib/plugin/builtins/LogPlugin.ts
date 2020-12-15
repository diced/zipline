import { FastifyInstance } from 'fastify';
import Server from 'next/dist/next-server/server/next-server';
import { Connection } from 'typeorm';
import { Config } from '../../Config';
import { Plugin } from '../Plugin';
import { textSync } from 'figlet';
import { magenta, blue, bold, red, green } from '@dicedtomato/colors';
import { readFileSync } from 'fs';
import { join } from 'path';

export default class implements Plugin {
  public name: string = "assets";

  public onLoad(server: FastifyInstance, orm: Connection, app: Server, config: Config) {
    if (config.core.log) console.log(`
${magenta(textSync('Zipline'))}
Version : ${blue(
      process.env.npm_package_version ||
      JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
        .version
    )}
GitHub  : ${blue('https://github.com/ZiplineProject/zipline')}
Issues  : ${blue('https://github.com/ZiplineProject/zipline/issues')}
Docs    : ${blue('https://zipline.diced.wtf/')}
Mode    : ${bold(process.env.NODE_ENV !== 'production' ? red('dev') : green('production'))}
Verbose : ${bold(process.env.VERBOSE ? red('yes') : green('no'))}
`);
  }
}