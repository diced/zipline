export function first<T>(rows: readonly T[]): T | undefined {
  return rows[0];
}

export function firstOrNull<T>(rows: readonly T[]): T | null {
  return rows[0] ?? null;
}

export type PostgresError = Error & {
  code: string;
  constraint?: string;
};

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
