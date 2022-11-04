import { readFile } from 'fs/promises';
import config from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes) {
  if (!config.website.show_version) return res.forbidden('version hidden');

  const pkg = JSON.parse(await readFile('package.json', 'utf8'));

  const re = await fetch('https://raw.githubusercontent.com/WinterFe/zipline/trunk/package.json');
  const upstreamPkg = await re.json();

  return res.json({
    local: pkg.version,
    upstream: upstreamPkg.version,
  });
}

export default withZipline(handler, {
  methods: ['GET'],
  user: true,
});
