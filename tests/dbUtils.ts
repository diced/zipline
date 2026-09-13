import assert from 'assert/strict';
import { PgDialect, pgTable, text } from 'drizzle-orm/pg-core';
import { test } from 'node:test';
import { containsText, escapeLike } from '@/lib/db/utils';

test('SQL LIKE escaping protects percent, underscore, and backslash characters', () => {
  assert.equal(escapeLike('100%_done\\file'), '100\\%\\_done\\\\file');
  assert.equal(escapeLike('plain text'), 'plain text');
  assert.equal(escapeLike(''), '');
});

test('containsText binds escaped search input as a parameter', () => {
  const table = pgTable('test_files', { name: text('name') });
  const input = "%' OR 1=1 --_\\";
  const query = new PgDialect().sqlToQuery(containsText(table.name, input));

  assert.equal(query.sql, '"test_files"."name" ilike $1');
  assert.deepEqual(query.params, ["%\\%' OR 1=1 --\\_\\\\%"]);
});
