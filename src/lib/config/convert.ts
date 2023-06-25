import type { ValidatedEnv } from './read';

export function convertEnv(env: ValidatedEnv) {
  return {
    core: {
      port: env.PORT,
      sessionSecret: env.SESSION_SECRET,
      databaseUrl: env.DATABASE_URL,
    },
    files: {
      route: env.FILES_ROUTE,
    },
  };
}
