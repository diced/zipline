import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';
import { API_ERRORS, ApiError, ApiErrorCode } from '../../src/lib/api/errors';

export const ALL_METHODS = ['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'] as const;

const ALL_ERRORS = Object.keys(API_ERRORS)
  .map((code) => new ApiError(Number(code) as ApiErrorCode).toJSON())
  .sort((a, b) => a.code - b.code);

const ERROR_CODE_SCHEMA = {
  type: 'integer',
  format: 'int32',
  description:
    'Zipline API error code. Ranges: 1xxx validation, 2xxx session, 3xxx permission, 4xxx not-found, 5xxx constraint, 6xxx internal, 9xxx generic.',
  enum: ALL_ERRORS.map((entry) => entry.code),
  'x-enumDescriptions': ALL_ERRORS.map((entry) => API_ERRORS[entry.code as ApiErrorCode]),
} satisfies OpenAPIV3.NonArraySchemaObject & { 'x-enumDescriptions': string[] };

const ERROR_SCHEMA = {
  type: 'object',
  description: 'Generic error for API endpoints.',
  properties: {
    error: {
      type: 'string',
      description:
        'Message for the error. This may differ from the standard message for the error code, but the error code should be used to figure out the type of error.',
    },
    code: ERROR_CODE_SCHEMA,
    statusCode: {
      type: 'integer',
      format: 'int32',
      description: 'HTTP status code returned alongside this error payload.',
    },
  },
  required: ['error', 'code', 'statusCode'],
  additionalProperties: true,
} satisfies OpenAPIV3.SchemaObject;

export function prepareOpenApiSpec(spec: OpenAPIV3.Document): OpenAPIV3.Document {
  spec.paths = Object.fromEntries(
    Object.entries(spec.paths).filter(([route]) => route === '/api' || route.startsWith('/api/')),
  );

  spec.components ??= {};
  spec.components.schemas ??= {};
  spec.components.responses ??= {};
  spec.components.schemas.ApiError = ERROR_SCHEMA;

  for (const range of ['4XX', '5XX'] as const) {
    const examples = Object.fromEntries(
      ALL_ERRORS.filter((entry) => Math.floor(entry.statusCode / 100) === Number(range[0])).map((entry) => [
        `E${entry.code}`,
        { summary: entry.error, value: entry },
      ]),
    );
    const responseName = range === '4XX' ? 'ClientError' : 'ServerError';
    const response: OpenAPIV3.ResponseObject = {
      description: `API error response (${range})`,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ApiError' },
          examples,
        },
      },
    };
    spec.components.responses[responseName] = response;

    for (const pathItem of Object.values(spec.paths)) {
      for (const method of ALL_METHODS) {
        const operation = pathItem?.[method];
        if (!operation) continue;

        operation.responses ??= {};
        // Preserve explicitly documented errors, including legacy lowercase ranges.
        const existing = operation.responses[range] ?? operation.responses[range.toLowerCase()];
        delete operation.responses[range.toLowerCase()];
        operation.responses[range] = existing ?? { $ref: `#/components/responses/${responseName}` };
      }
    }
  }

  return spec;
}

export async function validateOpenApiSpec(spec: OpenAPIV3.Document): Promise<void> {
  await SwaggerParser.validate(structuredClone(spec), { resolve: { external: false } });
}
