import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile('.env');
} catch {}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const username = process.env.DATABASE_USERNAME;
  const password = process.env.DATABASE_PASSWORD;
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT;
  const database = process.env.DATABASE_NAME;
  if (!username || !password || !host || !port || !database) return undefined;

  return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const url = getDatabaseUrl();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
  ...(url ? { dbCredentials: { url } } : {}),
});
