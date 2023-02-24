import { readFile } from 'fs/promises';
import config from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';

async function handler(_: NextApiReq, res: NextApiRes) {
  if (!config.website.show_version) return res.forbidden('version hidden');

  const pkg = JSON.parse(await readFile('package.json', 'utf8'));

  // TODO: this needs to change to zipline.diced.tech once 3.7.0 is released
  const re = await fetch('https://trunk.zipline.diced.tech/api/version?c=' + pkg.version);
  const json = await re.json();

  let updateToType = 'stable';

  if (json.isUpstream) {
    updateToType = 'upstream';

    if (json.update?.stable) {
      updateToType = 'stable';
    }
  }

  return res.json({
    isUpstream: true,
    update: json.update?.stable || json.update?.upstream,
    updateToType,
    versions: {
      stable: json.git.stable,
      upstream: json.git.upstream,
      current: json.current,
    },
  });
}

export default withZipline(handler, {
  methods: ['GET'],
  user: true,
});
