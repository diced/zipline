import { oauthProviderTypeValues, roleValues, userFilesQuotaValues } from '@/lib/db/enums';
import type { Zipline } from '@/lib/db/schema';
import { z } from 'zod';

export type Export4 = z.infer<typeof export4Schema>;

export const export4Schema = z.object({
  versions: z.object({
    zipline: z.string(),
    node: z.string(),
    export: z.literal('4'),
  }),
  request: z.object({
    user: z.custom<`${string}:${string}`>((data) => {
      if (typeof data !== 'string') return false;

      const parts = data.split(':');
      if (parts.length !== 2) return false;

      const [username, id] = parts;
      if (!username || !id) return false;

      return data;
    }),
    date: z.string(),
    os: z.object({
      platform: z.union([
        z.literal('aix'),
        z.literal('darwin'),
        z.literal('freebsd'),
        z.literal('linux'),
        z.literal('openbsd'),
        z.literal('sunos'),
        z.literal('win32'),
        z.literal('android'),
      ]),
      arch: z.union([
        z.literal('arm'),
        z.literal('arm64'),
        z.literal('ia32'),
        z.literal('loong64'),
        z.literal('mips'),
        z.literal('mipsel'),
        z.literal('ppc'),
        z.literal('ppc64'),
        z.literal('riscv64'),
        z.literal('s390'),
        z.literal('s390x'),
        z.literal('x64'),
      ]),
      cpus: z.number(),
      hostname: z.string(),
      release: z.string(),
    }),
    env: z.record(z.string(), z.string()),
  }),
  data: z.object({
    settings: z.custom<Zipline>(),
    users: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        username: z.string(),
        password: z.string().nullish(),
        avatar: z.string().nullish(),
        role: z.enum(roleValues),
        view: z.record(z.string(), z.any()),
        totpSecret: z.string().nullish(),
      }),
    ),
    userPasskeys: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        lastUsed: z
          .string()
          .nullish()
          .refine((date) => (date ? !isNaN(Date.parse(date)) : true), 'Invalid date'),
        name: z.string(),
        reg: z.record(z.string(), z.any()),
        userId: z.string(),
      }),
    ),
    userQuotas: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        filesQuota: z.enum(userFilesQuotaValues),
        maxBytes: z.string().nullish(),
        maxFiles: z.number().nullish(),
        maxUrls: z.number().nullish(),
        userId: z.string().nullish(),
      }),
    ),
    userOauthProviders: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        provider: z.enum(oauthProviderTypeValues),
        username: z.string(),
        accessToken: z.string(),
        refreshToken: z.string().nullish(),
        oauthId: z.string().nullish(),
        userId: z.string(),
      }),
    ),
    userTags: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        name: z.string(),
        color: z.string().nullish(),
        files: z.array(z.string()),
        userId: z.string(),
      }),
    ),
    invites: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        expiresAt: z
          .string()
          .nullish()
          .refine((date) => (date ? !isNaN(Date.parse(date)) : true), 'Invalid date'),
        code: z.string(),
        uses: z.number(),
        maxUses: z.number().nullish(),
        inviterId: z.string(),
      }),
    ),
    folders: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        name: z.string(),
        public: z.boolean(),
        allowUploads: z.boolean(),
        files: z.array(z.string()),
        userId: z.string(),
        parentId: z.string().nullish(),
      }),
    ),
    urls: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        code: z.string(),
        vanity: z.string().nullish(),
        destination: z.string(),
        views: z.number(),
        maxViews: z.number().nullish(),
        password: z.string().nullish(),
        enabled: z.boolean(),
        userId: z.string().nullish(),
      }),
    ),
    files: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        deletesAt: z
          .string()
          .nullish()
          .refine((date) => (date ? !isNaN(Date.parse(date)) : true), 'Invalid date'),
        name: z.string(),
        originalName: z.string().nullish(),
        size: z.number(),
        type: z.string(),
        views: z.number(),
        maxViews: z.number().nullish(),
        favorite: z.boolean(),
        password: z.string().nullish(),
        userId: z.string().nullable(),
        folderId: z.string().nullish(),
      }),
    ),
    thumbnails: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        path: z.string(),
        fileId: z.string(),
      }),
    ),
    metrics: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        data: z.record(z.string(), z.any()),
      }),
    ),
  }),
});

export function validateExport(data: unknown): ReturnType<typeof export4Schema.safeParse> {
  const result = export4Schema.safeParse(data);

  if (!result.success) {
    if (typeof window === 'object') console.error('Failed to validate export4 data', result.error.issues);
  }

  return result;
}
