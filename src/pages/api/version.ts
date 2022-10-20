import { readFile } from 'fs/promises';
import config from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';

async function handler(req: NextApiReq, res: NextApiRes) {
  const user = await req.user();
  if (!user) return res.forbid('not logged in');

  if (!config.website.show_version) return res.bad('version hidden');

  const pkg = JSON.parse(await readFile('package.json', 'utf8'));

  const re = await fetch('https://raw.githubusercontent.com/diced/zipline/trunk/package.json');
  const upstreamPkg = await re.json();

  return res.json({
    local: pkg.version,
    upstream: upstreamPkg.version,
  });
}

export default withZipline(handler);
