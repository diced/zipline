import { readFile } from 'fs/promises';
import Logger from 'lib/logger';
import prisma from 'lib/prisma';
import { randomChars } from 'lib/util';
import { bytesToHuman } from 'lib/utils/bytes';
import { NextApiReq, NextApiRes, UserExtended, withZipline } from 'middleware/withZipline';
import os from 'os';

const logger = Logger.get('admin').child('export');

type Zipline3Export = {
  versions: {
    zipline: string;
    node: string;
    export: '3';
  };

  request: {
    user: string;
    date: string;
    os: {
      platform: 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32';
      arch:
        | 'arm'
        | 'arm64'
        | 'ia32'
        | 'loong64'
        | 'mips'
        | 'mipsel'
        | 'ppc'
        | 'ppc64'
        | 'riscv64'
        | 's390'
        | 's390x'
        | 'x64';
      cpus: number;
      hostname: string;
      release: string;
    };
    env: NodeJS.ProcessEnv;
  };

  // Creates a unique identifier for each model
  // used to map the user's stuff to other data owned by the user
  user_map: Record<number, string>;
  thumbnail_map: Record<number, string>;
  folder_map: Record<number, string>;
  file_map: Record<number, string>;
  url_map: Record<number, string>;
  invite_map: Record<number, string>;

  users: {
    [id: string]: {
      username: string;
      password: string;
      avatar: string;
      administrator: boolean;
      super_administrator: boolean;
      embed: {
        title?: string;
        site_name?: string;
        description?: string;
        color?: string;
      };
      totp_secret: string;
      oauth: {
        provider: 'DISCORD' | 'GITHUB' | 'GOOGLE';
        username: string;
        oauth_id: string;
        access_token: string;
        refresh_token: string;
      }[];
    };
  };

  files: {
    [id: string]: {
      name: string;
      original_name: string;
      type: `${string}/${string}`;
      size: number | bigint;
      user: string | null;
      thumbnail?: string;
      max_views: number;
      views: number;
      expires_at?: string;
      created_at: string;
      favorite: boolean;
      password?: string;
    };
  };

  thumbnails: {
    [id: string]: {
      name: string;
      created_at: string;
    };
  };

  folders: {
    [id: string]: {
      name: string;
      public: boolean;
      created_at: string;
      user: string;
      files: string[];
    };
  };

  urls: {
    [id: number]: {
      destination: string;
      vanity?: string;
      code: string;
      created_at: string;
      max_views: number;
      views: number;
      user: string;
    };
  };

  invites: {
    [id: string]: {
      code: string;
      expites_at?: string;
      created_at: string;
      used: boolean;

      created_by_user: string;
    };
  };

  stats: {
    created_at: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  }[];
};

async function handler(req: NextApiReq, res: NextApiRes, user: UserExtended) {
  if (!user.superAdmin) return res.forbidden('You must be a super administrator to export data');

  const pkg = JSON.parse(await readFile('package.json', 'utf8'));

  const exportData: Partial<Zipline3Export> = {
    versions: {
      zipline: pkg.version,
      node: process.version,
      export: '3',
    },
    request: {
      user: '',
      date: new Date().toISOString(),
      os: {
        platform: os.platform() as Zipline3Export['request']['os']['platform'],
        arch: os.arch() as Zipline3Export['request']['os']['arch'],
        cpus: os.cpus().length,
        hostname: os.hostname(),
        release: os.release(),
      },
      env: process.env,
    },
    user_map: {},
    thumbnail_map: {},
    folder_map: {},
    file_map: {},
    url_map: {},
    invite_map: {},

    users: {},
    files: {},
    thumbnails: {},
    folders: {},
    urls: {},
    invites: {},
    stats: [],
  };

  const users = await prisma.user.findMany({
    include: {
      oauth: true,
    },
  });

  for (const user of users) {
    const uniqueId = randomChars(32);
    exportData.user_map[user.id] = uniqueId;

    exportData.users[uniqueId] = {
      username: user.username,
      password: user.password,
      avatar: user.avatar,
      administrator: user.administrator,
      super_administrator: user.superAdmin,
      embed: user.embed as Zipline3Export['users'][string]['embed'],
      totp_secret: user.totpSecret,
      oauth: user.oauth.map((oauth) => ({
        provider: oauth.provider as Zipline3Export['users'][string]['oauth'][0]['provider'],
        username: oauth.username,
        oauth_id: oauth.oauthId,
        access_token: oauth.token,
        refresh_token: oauth.refresh,
      })),
    };
  }

  const folders = await prisma.folder.findMany({ include: { files: true } });
  for (const folder of folders) {
    const uniqueId = randomChars(32);
    exportData.folder_map[folder.id] = uniqueId;

    exportData.folders[uniqueId] = {
      name: folder.name,
      public: folder.public,
      created_at: folder.createdAt.toISOString(),
      user: exportData.user_map[folder.userId],
      files: [], // mapped later
    };
  }

  const thumbnails = await prisma.thumbnail.findMany();
  for (const thumbnail of thumbnails) {
    const uniqueId = randomChars(32);
    exportData.thumbnail_map[thumbnail.id] = uniqueId;

    exportData.thumbnails[uniqueId] = {
      name: thumbnail.name,
      created_at: thumbnail.createdAt.toISOString(),
    };
  }

  const files = await prisma.file.findMany({ include: { thumbnail: true } });

  for (const file of files) {
    const uniqueId = randomChars(32);
    exportData.file_map[file.id] = uniqueId;

    exportData.files[uniqueId] = {
      name: file.name,
      original_name: file.originalName,
      type: file.mimetype as Zipline3Export['files'][0]['type'],
      size: file.size,
      user: file.userId ? exportData.user_map[file.userId] : null,
      thumbnail: file.thumbnail ? exportData.thumbnail_map[file.thumbnail.id] : undefined,
      max_views: file.maxViews,
      views: file.views,
      expires_at: file.expiresAt?.toISOString(),
      created_at: file.createdAt.toISOString(),
      favorite: file.favorite,
      password: file.password,
    };
  }

  const urls = await prisma.url.findMany();

  for (const url of urls) {
    const uniqueId = randomChars(32);
    exportData.url_map[url.id] = uniqueId;

    exportData.urls[uniqueId] = {
      destination: url.destination,
      vanity: url.vanity,
      created_at: url.createdAt.toISOString(),
      max_views: url.maxViews,
      views: url.views,
      user: exportData.user_map[url.userId],
      code: url.id,
    };
  }

  const invites = await prisma.invite.findMany();

  for (const invite of invites) {
    const uniqueId = randomChars(32);
    exportData.invite_map[invite.id] = uniqueId;

    exportData.invites[uniqueId] = {
      code: invite.code,
      expites_at: invite.expiresAt?.toISOString() ?? undefined,
      created_at: invite.createdAt.toISOString(),
      used: invite.used,
      created_by_user: exportData.user_map[invite.createdById],
    };
  }

  exportData.request.user = exportData.user_map[user.id];

  for (const folder of folders) {
    exportData.folders[exportData.folder_map[folder.id]].files = folder.files.map(
      (file) => exportData.file_map[file.id],
    );
  }

  const stringed = JSON.stringify(exportData);
  logger.info(`${user.id} created export of size ${bytesToHuman(stringed.length)}`);

  return res
    .setHeader('Content-Disposition', `attachment; filename="zipline_export_${Date.now()}.json"`)
    .setHeader('Content-Type', 'application/json')
    .send(stringed);
}

export default withZipline(handler, {
  methods: ['GET'],
  user: true,
  administrator: true,
});
