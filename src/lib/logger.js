const { format } = require('fecha');
const { blueBright, red, cyan } = require('colorette');

module.exports = class Logger {
  static get(clas) {
    if (typeof clas !== 'function') if (typeof clas !== 'string') throw new Error('not string/function');

    const name = clas.name ?? clas;

    return new Logger(name);
  }

  constructor (name) {
    this.name = name;
  }

  info(message) {
    console.log(this.formatMessage('INFO', this.name, message));
  }

  error(error) {
    console.log(this.formatMessage('ERROR', this.name, error.stack ?? error));
  }

  formatMessage(level, name, message) {
    const time = format(new Date(), 'YYYY-MM-DD hh:mm:ss,SSS A');
    return `${time} ${this.formatLevel(level)} [${blueBright(name)}] ${message}`;
  }

  formatLevel(level) {
    switch (level) {
    case 'INFO':
      return cyan('INFO ');
    case 'ERROR':
      return red('ERROR');
    }
  }
};