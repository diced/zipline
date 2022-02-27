import { readFile } from 'fs/promises';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';


async function handler(req: NextApiReq, res: NextApiRes) {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));

  const re = await fetch('https://raw.githubusercontent.com/diced/zipline/trunk/package.json');
  const upstreamPkg = await re.json();

  return res.json({
    local: pkg.version,
    upstream: upstreamPkg.version,
  });
}

export default withZipline(handler);