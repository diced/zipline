import { ilike } from 'drizzle-orm';

// TODO: replace with something else?
export function escapeLike(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

export function containsText(column: Parameters<typeof ilike>[0], value: string) {
  return ilike(column, `%${escapeLike(value)}%`);
}

export function isPostgresError(error: unknown, code?: string): boolean {
  let current = error;

  while (current instanceof Error) {
    if ('code' in current && typeof current.code === 'string') {
      return code === undefined || current.code === code;
    }

    current = current.cause;
  }

  return false;
}
