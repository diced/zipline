import { reloadSettings } from '@/lib/config';
import { rawConfig } from '@/lib/config/read';
import { DATABASE_TO_PROP } from '@/lib/config/read/db';
import { ENVS } from '@/lib/config/read/env';
import { getProperty } from '@/lib/config/read/transform';
import { validateConfigObject } from '@/lib/config/validate';
import { prisma } from '@/lib/db';
import { randomCharacters } from '@/lib/random';

function convertValueToEnv(
  value: any,
  identified: NonNullable<ReturnType<typeof getEnvFromProperty>>,
): string {
  if (value === null || value === undefined) {
    console.warn(`Value for property ${identified.property} is null or undefined.`);
    return '';
  }

  if (Array.isArray(value) && value.length === 0) return '';

  switch (identified.type) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return value.toString();
    case 'string':
    case 'ms':
    case 'byte':
      return `"${value.replace(/"/g, '\\"')}"`;
    case 'string[]':
      return `"${value.map((v: string) => v.replace(/"/g, '\\"')).join(',')}"`;
    case 'json':
      return `"${JSON.stringify(value).replace(/"/g, '\\"')}"`;
    default:
      console.warn(`Unknown type for property ${identified.property}: ${identified.type}`);
      return '';
  }
}

function getEnvFromProperty(property: string): NonNullable<typeof env> | null {
  const env = ENVS.find(
    (env) => env.property === DATABASE_TO_PROP[property as keyof typeof DATABASE_TO_PROP],
  );
  if (!env) {
    console.warn(`No environment variable found for property: ${property}`);
    return null;
  }

  return env;
}

export async function exportConfig({ yml, showDefaults }: { yml?: boolean; showDefaults?: boolean }) {
  const clonedDefault = structuredClone(rawConfig);
  clonedDefault.core.secret = randomCharacters(32);
  clonedDefault.core.databaseUrl = 'postgres://pg:pg@pg/pg';

  const defaultConfig = validateConfigObject(clonedDefault);

  await reloadSettings();

  const ziplineTable = await prisma.zipline.findFirst({
    omit: {
      id: true,
      createdAt: true,
      updatedAt: true,
      firstSetup: true,
    },
  });
  if (!ziplineTable) {
    console.error('No Zipline configuration found in the database, run the setup again.');
    return;
  }

  for (const [key, value] of Object.entries(ziplineTable)) {
    if (value === null || value === undefined) continue;

    const envVar = getEnvFromProperty(key);
    if (!envVar) continue;

    const defaultValue = getProperty(defaultConfig, envVar.property);
    if (value === defaultValue && !showDefaults) continue;

    const envValue = convertValueToEnv(value, envVar);
    if (envValue.trim() === '') continue;

    console.log(`${yml ? '- ' : ''}${envVar.variable}=${envValue}`);
  }

  process.exit(0);
}
