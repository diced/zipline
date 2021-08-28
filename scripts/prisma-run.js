const { spawn } = require('child_process');
const { join } = require('path');

module.exports = (url, args, nostdout = false) => {
  return new Promise((res, rej) => {
    const proc = spawn(join(process.cwd(), 'node_modules', '.bin', 'prisma'), args, {
      env: {
        DATABASE_URL: url,
        ...process.env
      },
    });

    let a = '';

    proc.stdout.on('data', d => {
      if (!nostdout) console.log(d.toString());
      a += d.toString();
    });
    proc.stderr.on('data', d => {
      if (!nostdout) console.log(d.toString());
      rej(d.toString());
    });
    proc.stdout.on('end', () => res(a));
    proc.stdout.on('close', () => res(a));
  });
};
