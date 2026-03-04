import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { run, step } from '.';
import { API_ERRORS, ApiError, ApiErrorCode } from '../src/lib/api/errors';

const ALL_METHODS = ['delete', 'get', 'head', 'patch', 'post', 'put'];
const GEN_PATH = path.resolve(__dirname, '..', 'openapi.json');

const ALL_ERRORS = Object.keys(API_ERRORS)
  .map((code) => new ApiError(Number(code) as ApiErrorCode).toJSON())
  .sort((a, b) => a.code - b.code);

const ERROR_SCHEMA = {
  type: 'object',
  description: 'Generic error for API endpoints.',
  properties: {
    error: {
      type: 'string',
      description:
        'Message for the error. This may differ from the standard message for the error code, but the error code should be used to figure out the type of error.',
    },
    code: {
      type: 'integer',
      format: 'int32',
      description:
        'Zipline API error code. Ranges: 1xxx validation, 2xxx session, 3xxx permission, 4xxx not-found, 5xxx constraint, 6xxx internal, 9xxx generic.',
      enum: ALL_ERRORS.map((entry) => entry.code),
      'x-enumDescriptions': ALL_ERRORS.map((entry) => entry.message),
    },
    statusCode: {
      type: 'integer',
      format: 'int32',
      description: 'HTTP status code returned alongside this error payload.',
    },
  },
  required: ['error', 'code', 'statusCode'],
  additionalProperties: true,
};

const ERROR_EXAMPLES = ALL_ERRORS.reduce<Record<string, unknown>>((examples, entry) => {
  examples[`E${entry.code}`] = {
    summary: `${entry.error}`,
    value: entry,
  };

  return examples;
}, {});

const generic4xxResponse = {
  description: 'API error response (4xx)',
  content: {
    'application/json': {
      schema: ERROR_SCHEMA,
      examples: ERROR_EXAMPLES,
    },
  },
};

function addErrorResponse(responses: Record<string, any>): void {
  const response = (responses['4xx'] ??= structuredClone(generic4xxResponse));

  response.description ??= generic4xxResponse.description;
  response.content ??= {};

  const jsonContent = (response.content['application/json'] ??= {});
  jsonContent.schema ??= structuredClone(ERROR_SCHEMA);
  jsonContent.examples ??= structuredClone(generic4xxResponse.content['application/json'].examples);
}

function filterRoutes(paths = {}): Record<string, any> {
  return Object.fromEntries(Object.entries(paths).filter(([route]) => route.startsWith('/api')));
}

async function fixSpec() {
  const spec = JSON.parse(await readFile(GEN_PATH, 'utf8'));

  spec.paths = filterRoutes(spec.paths);

  for (const [, pathItem] of Object.entries(spec.paths ?? {})) {
    if (!pathItem) continue;

    for (const method of ALL_METHODS) {
      const operation = (<any>pathItem)[method];
      if (!operation) continue;

      operation.responses ??= {};
      addErrorResponse(operation.responses);
    }
  }

  await writeFile(GEN_PATH, JSON.stringify(spec));
}

process.env.ZIPLINE_OUTPUT_OPENAPI = 'true';

run(
  'openapi',
  step('run-prod', 'pnpm start', () => process.env.NODE_ENV === 'production'),
  step('run-dev', 'pnpm dev', () => process.env.NODE_ENV !== 'production'),
  step('check', async () => {
    try {
      await readFile(GEN_PATH);
    } catch (e) {
      console.error('\nSomething went wrong...', e);

      throw new Error('No OpenAPI spec found at ./openapi.json');
    }
  }),
  step('fix', fixSpec),
);
