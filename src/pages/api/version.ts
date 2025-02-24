import { readFile } from 'fs/promises';
import config from 'lib/config';
import { NextApiReq, NextApiRes, withZipline } from 'middleware/withZipline';

async function handler(_: NextApiReq, res: NextApiRes) {
  if (!config.website.show_version) return res.forbidden('version hidden');

  const pRev = await (async function () {
    try {
      return await readFile('.git/HEAD', 'utf8');
    } catch (e) {
      return JSON.parse(await readFile('package.json', 'utf8')).version;
    }
  })();
  const { groups } = new RegExp(/^ref: (?<ref>(\w+\/?)*)/).exec(pRev) || { groups: null };
  let rev: string;

  if (!groups) rev = pRev;
  else rev = await readFile(`.git/${groups.ref}`, 'utf8');

  const re = await fetch(`https://v3.zipline.diced.sh/api/version?c=?c=${rev}`);
  const json = await re.json();

  if (!re.ok) return res.badRequest(json.error);
  let updateToType = 'stable';
  if (json.isUpstream) updateToType = 'upstream';

  return res.json({
    isUpstream: json.isUpstream,
    update: json.isUpstream ? json.update?.upstream : json.update?.stable,
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
