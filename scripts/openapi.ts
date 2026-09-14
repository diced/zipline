import { readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { run, step } from '.';
import { prepareOpenApiSpec, validateOpenApiSpec } from './lib/openapi';

const GEN_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'openapi.json');

async function fixSpec() {
  try {
    const spec = prepareOpenApiSpec(JSON.parse(await readFile(GEN_PATH, 'utf8')));
    await validateOpenApiSpec(spec);
    await writeFile(GEN_PATH, `${JSON.stringify(spec, null, 2)}\n`);
  } catch (error) {
    console.error('OpenAPI generation failed:', error);
    await rm(GEN_PATH, { force: true });
    throw error;
  }
}

process.env.ZIPLINE_OUTPUT_OPENAPI = 'true';

run(
  'openapi',
  step('clean', () => rm(GEN_PATH, { force: true })),
  step('run-prod', 'pnpm start', () => process.env.NODE_ENV === 'production'),
  step('run-dev', 'pnpm dev', () => process.env.NODE_ENV !== 'production'),
  step('fix', fixSpec),
);
