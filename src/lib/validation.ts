import z from 'zod';
import { MAX_INT32 } from './primitive';
import { sanitizeFilename } from './fs';

export function zValidatePath(val: string | undefined, ctx: z.RefinementCtx) {
  if (!val) return;

  const sanitized = sanitizeFilename(val);
  if (!sanitized) {
    ctx.addIssue({
      code: 'custom',
      message: 'Invalid path',
      input: val,
    });

    return undefined;
  }

  return sanitized;
}

export const zStringTrimmed = z.string().trim().min(1);

export const zQsBoolean = z.enum(['true', 'false']).transform((val) => val === 'true');

export const paginationQs = z.object({
  page: z.coerce.number().int().min(1).max(MAX_INT32),
  perpage: z.coerce.number().int().min(1).max(100).default(15),
  filter: z.enum(['dashboard', 'none', 'all']).optional().default('none'),
  favorite: zQsBoolean.default(false).optional(),
  sortBy: z
    .enum([
      'id',
      'createdAt',
      'updatedAt',
      'deletesAt',
      'name',
      'originalName',
      'size',
      'type',
      'views',
      'favorite',
    ])
    .optional()
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});
