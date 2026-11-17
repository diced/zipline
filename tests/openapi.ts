import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OpenAPIV3 } from 'openapi-types';
import { prepareOpenApiSpec, validateOpenApiSpec } from '../scripts/lib/openapi';

test('documents multipart upload bodies without replacing existing schemas', async () => {
  const operation = () => ({ responses: { 200: { description: 'Success' } } });
  const spec: OpenAPIV3.Document = {
    openapi: '3.0.3',
    info: { title: 'Test', version: '1.0.0' },
    paths: {
      '/api/upload': { post: operation() },
      '/api/upload/partial': { post: operation() },
    },
  };

  prepareOpenApiSpec(spec);
  const upload = spec.paths['/api/upload']!.post!.requestBody as OpenAPIV3.RequestBodyObject;
  const partial = spec.paths['/api/upload/partial']!.post!.requestBody as OpenAPIV3.RequestBodyObject;
  assert.deepEqual(upload.content['multipart/form-data'].schema, {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'array', items: { type: 'string', format: 'binary' }, minItems: 1 } },
  });
  assert.deepEqual(partial.content['multipart/form-data'].schema, {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'string', format: 'binary' } },
  });
  await validateOpenApiSpec(spec);

  const existing: OpenAPIV3.RequestBodyObject = { content: { 'application/json': {} } };
  spec.paths['/api/upload']!.post!.requestBody = existing;
  prepareOpenApiSpec(spec);
  assert.equal(spec.paths['/api/upload']!.post!.requestBody, existing);
});
