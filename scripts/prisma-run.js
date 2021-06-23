const { spawn } = require('child_process');
const { join } = require('path');

module.exports = (url, args) => {
  return new Promise((res, rej) => {
    const proc = spawn(join(process.cwd(), 'node_modules', '.bin', 'prisma'), args, {
      env: {
        DATABASE_URL: url,
        ...process.env
      },
    });

    proc.stdout.on('data', d => console.log(d.toString()));
    proc.stderr.on('data', d => {
      console.log(d.toString());

      rej(d.toString());
    });

    proc.stdout.on('close', () => res());
    
  });
};
