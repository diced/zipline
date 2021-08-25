const { format } = require('fecha');
const { yellow, blueBright, magenta, red, cyan } = require('colorette');

class Logger {
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
    console.log(this.formatMessage('ERROR', this.name, error.toString()));
  }

  formatMessage(level, name, message) {
    const time = format(new Date(), 'YYYY-MM-DD hh:mm:ss,SSS A');
    return `${time} ${this.formatLevel(level)} [${blueBright(name)}] ${message}`;
  }

  formatLevel(level) {
    switch (level) {
    case 'INFO':
      return cyan('INFO ');
    case 'DEBUG':
      return yellow('DEBUG');
    case 'WARN':
      return magenta('WARN ');
    case 'ERROR':
      return red('ERROR');
    }
  }
}

module.exports = Logger;