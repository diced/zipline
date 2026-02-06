import { Zipline } from '@/prisma/client';
import { OAuthProviderType, Role, UserFilesQuota } from '@/prisma/enums';
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
        password: z.string().nullable().optional(),
        avatar: z.string().nullable().optional(),
        role: z.enum(Role),
        view: z.record(z.string(), z.unknown()),
        totpSecret: z.string().nullable().optional(),
      }),
    ),
    userPasskeys: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        lastUsed: z
          .string()
          .nullable()
          .optional()
          .refine((date) => (date ? !isNaN(Date.parse(date)) : true), 'Invalid date'),
        name: z.string(),
        reg: z.record(z.string(), z.unknown()),
        userId: z.string(),
      }),
    ),
    userQuotas: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        filesQuota: z.enum(UserFilesQuota),
        maxBytes: z.string().nullable().optional(),
        maxFiles: z.number().nullable().optional(),
        maxUrls: z.number().nullable().optional(),
        userId: z.string().nullable().optional(),
      }),
    ),
    userOauthProviders: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        provider: z.enum(OAuthProviderType),
        username: z.string(),
        accessToken: z.string(),
        refreshToken: z.string().nullable().optional(),
        oauthId: z.string().nullable().optional(),
        userId: z.string(),
      }),
    ),
    userTags: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        name: z.string(),
        color: z.string().nullable().optional(),
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
          .nullable()
          .optional()
          .refine((date) => (date ? !isNaN(Date.parse(date)) : true), 'Invalid date'),
        code: z.string(),
        uses: z.number(),
        maxUses: z.number().nullable().optional(),
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
        parentId: z.string().nullable().optional(),
      }),
    ),
    urls: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        code: z.string(),
        vanity: z.string().nullable().optional(),
        destination: z.string(),
        views: z.number(),
        maxViews: z.number().nullable().optional(),
        password: z.string().nullable().optional(),
        enabled: z.boolean(),
        userId: z.string().nullable().optional(),
      }),
    ),
    files: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
        deletesAt: z
          .string()
          .nullable()
          .optional()
          .refine((date) => (date ? !isNaN(Date.parse(date)) : true), 'Invalid date'),
        name: z.string(),
        originalName: z.string().nullable().optional(),
        size: z.number(),
        type: z.string(),
        views: z.number(),
        maxViews: z.number().nullable().optional(),
        favorite: z.boolean(),
        password: z.string().nullable().optional(),
        userId: z.string().nullable(),
        folderId: z.string().nullable().optional(),
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
        data: z.record(z.string(), z.unknown()),
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
