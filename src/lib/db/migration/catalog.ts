import baselineSnapshot from '../../../../drizzle/meta/0000_snapshot.json' with { type: 'json' };
import type { DrizzleSnapshotJSON } from 'drizzle-kit/api';
import type { Client } from 'pg';

type CatalogColumn = {
  table_name: string;
  column_name: string;
  data_type: string;
  not_null: boolean;
  has_default: boolean;
  default_expression: string | null;
};

type CatalogIndex = {
  table_name: string;
  index_name: string;
  is_unique: boolean;
  is_primary: boolean;
  method: string;
  columns: string[];
};

type CatalogForeignKey = {
  name: string;
  table_from: string;
  table_to: string;
  columns_from: string[];
  columns_to: string[];
  on_delete: string;
  on_update: string;
};

// This file is emitted by drizzle-kit. Validate it against drizzle-kit's public snapshot shape while
// retaining the imported JSON's concrete table and column types for the catalog comparison below.
function defineSnapshot<T extends DrizzleSnapshotJSON>(value: T) {
  return value;
}

const snapshot = defineSnapshot(baselineSnapshot);
export const baselineTableNames = Object.values(snapshot.tables).map((table) => table.name);

function normalizeType(type: string) {
  return type
    .replace(/\s+without time zone$/, '')
    .replace(/\s+\(/g, '(')
    .replace(/^"(.+)"$/, '$1');
}

function normalizeIndexColumn(column: string) {
  return column.replace(/^"(.+)"$/, '$1').replace(/""/g, '"');
}

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJson);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableJson(child)]),
  );
}

function normalizeDefault(value: unknown, columnType: string) {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value !== 'string') return String(value);

  const type = normalizeType(columnType);
  const expression = value.trim();

  if (/^(?:CURRENT_TIMESTAMP|now\(\))$/i.test(expression)) return 'transaction_timestamp()';

  if (type.endsWith('[]')) {
    if (/^ARRAY\[\](?:::[\w" ]+\[\])?$/i.test(expression)) return '[]';
    if (/^'\{\}'(?:::[\w" ]+\[\])?$/i.test(expression)) return '[]';
  }

  if (type === 'jsonb') {
    const match = /^'(.*)'::jsonb$/s.exec(expression);
    if (match) {
      try {
        const parsed = JSON.parse(match[1].replaceAll("''", "'"));
        return `jsonb:${JSON.stringify(stableJson(parsed))}`;
      } catch {
        // Fall through to textual comparison so malformed or non-literal expressions are rejected.
      }
    }
  }

  return expression.replace(/::(?:text|"[^"]+")$/i, '');
}

function sameValues(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function fail(details: string[]) {
  throw new Error(`database catalog does not match the Prisma baseline: ${details.slice(0, 8).join('; ')}`);
}

async function assertColumns(client: Client) {
  const result = await client.query<CatalogColumn>(
    `
      SELECT
        table_class.relname AS table_name,
        attribute.attname AS column_name,
        pg_catalog.format_type(attribute.atttypid, attribute.atttypmod) AS data_type,
        attribute.attnotnull AS not_null,
        attribute.atthasdef AS has_default,
        pg_catalog.pg_get_expr(default_row.adbin, default_row.adrelid) AS default_expression
      FROM pg_catalog.pg_attribute AS attribute
      JOIN pg_catalog.pg_class AS table_class ON table_class.oid = attribute.attrelid
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = table_class.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef AS default_row
        ON default_row.adrelid = attribute.attrelid
        AND default_row.adnum = attribute.attnum
      WHERE namespace.nspname = 'public'
        AND table_class.relkind = 'r'
        AND table_class.relname = ANY($1::text[])
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
      ORDER BY table_class.relname, attribute.attnum
    `,
    [baselineTableNames],
  );

  const actual = new Map(result.rows.map((column) => [`${column.table_name}.${column.column_name}`, column]));
  const expectedKeys = new Set<string>();
  const errors: string[] = [];

  for (const table of Object.values(snapshot.tables)) {
    for (const column of Object.values(table.columns)) {
      const key = `${table.name}.${column.name}`;
      expectedKeys.add(key);
      const current = actual.get(key);
      if (!current) {
        errors.push(`missing column ${key}`);
        continue;
      }
      const hasExpectedDefault = 'default' in column;
      const expectedDefault = hasExpectedDefault ? column.default : undefined;

      if (normalizeType(current.data_type) !== normalizeType(column.type)) {
        errors.push(`${key} has type ${current.data_type}, expected ${column.type}`);
      }
      if (current.not_null !== column.notNull) {
        errors.push(`${key} has unexpected nullability`);
      }
      if (current.has_default !== hasExpectedDefault) {
        errors.push(`${key} has unexpected default state`);
      } else if (
        current.has_default &&
        normalizeDefault(current.default_expression, current.data_type) !==
          normalizeDefault(expectedDefault, column.type)
      ) {
        errors.push(`${key} has default ${current.default_expression}, expected ${String(expectedDefault)}`);
      }
    }
  }

  for (const key of actual.keys()) {
    if (!expectedKeys.has(key)) errors.push(`unexpected column ${key}`);
  }
  if (errors.length) fail(errors);
}

async function assertIndexes(client: Client) {
  const result = await client.query<CatalogIndex>(
    `
      SELECT
        table_class.relname AS table_name,
        index_class.relname AS index_name,
        pg_index.indisunique AS is_unique,
        pg_index.indisprimary AS is_primary,
        access_method.amname AS method,
        ARRAY(
          SELECT pg_get_indexdef(pg_index.indexrelid, position, true)
          FROM generate_series(1, pg_index.indnkeyatts) AS position
          ORDER BY position
        ) AS columns
      FROM pg_catalog.pg_index
      JOIN pg_catalog.pg_class AS table_class ON table_class.oid = pg_index.indrelid
      JOIN pg_catalog.pg_class AS index_class ON index_class.oid = pg_index.indexrelid
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = table_class.relnamespace
      JOIN pg_catalog.pg_am AS access_method ON access_method.oid = index_class.relam
      WHERE namespace.nspname = 'public'
        AND table_class.relname = ANY($1::text[])
      ORDER BY table_class.relname, index_class.relname
    `,
    [baselineTableNames],
  );

  const actual = new Map(result.rows.map((entry) => [`${entry.table_name}.${entry.index_name}`, entry]));
  const expected = new Map<
    string,
    { table: string; name: string; unique: boolean; primary: boolean; method: string; columns: string[] }
  >();

  for (const table of Object.values(snapshot.tables)) {
    const columnPrimaryKey = Object.values(table.columns).filter((column) => column.primaryKey);
    if (columnPrimaryKey.length) {
      const name = `${table.name}_pkey`;
      expected.set(`${table.name}.${name}`, {
        table: table.name,
        name,
        unique: true,
        primary: true,
        method: 'btree',
        columns: columnPrimaryKey.map((column) => column.name),
      });
    }

    for (const primaryKey of Object.values(table.compositePrimaryKeys)) {
      expected.set(`${table.name}.${primaryKey.name}`, {
        table: table.name,
        name: primaryKey.name,
        unique: true,
        primary: true,
        method: 'btree',
        columns: primaryKey.columns,
      });
    }

    for (const index of Object.values(table.indexes)) {
      expected.set(`${table.name}.${index.name}`, {
        table: table.name,
        name: index.name,
        unique: index.isUnique,
        primary: false,
        method: index.method,
        columns: index.columns.map((column) => column.expression),
      });
    }
  }

  const errors: string[] = [];
  for (const [key, index] of expected) {
    const current = actual.get(key);
    if (!current) {
      errors.push(`missing index ${key}`);
      continue;
    }

    const columns = current.columns.map(normalizeIndexColumn);
    if (
      current.is_unique !== index.unique ||
      current.is_primary !== index.primary ||
      current.method !== index.method ||
      !sameValues(columns, index.columns)
    ) {
      errors.push(`index ${key} has an unexpected definition`);
    }
  }
  for (const key of actual.keys()) {
    if (!expected.has(key)) errors.push(`unexpected index ${key}`);
  }
  if (errors.length) fail(errors);
}

const foreignKeyAction: Record<string, string> = {
  a: 'no action',
  r: 'restrict',
  c: 'cascade',
  n: 'set null',
  d: 'set default',
};

async function assertForeignKeys(client: Client) {
  const result = await client.query<CatalogForeignKey>(
    `
      SELECT
        constraint_row.conname AS name,
        source_table.relname AS table_from,
        target_table.relname AS table_to,
        ARRAY(
          SELECT source_attribute.attname::text
          FROM unnest(constraint_row.conkey) WITH ORDINALITY AS key_column(attnum, position)
          JOIN pg_catalog.pg_attribute AS source_attribute
            ON source_attribute.attrelid = constraint_row.conrelid
            AND source_attribute.attnum = key_column.attnum
          ORDER BY key_column.position
        ) AS columns_from,
        ARRAY(
          SELECT target_attribute.attname::text
          FROM unnest(constraint_row.confkey) WITH ORDINALITY AS key_column(attnum, position)
          JOIN pg_catalog.pg_attribute AS target_attribute
            ON target_attribute.attrelid = constraint_row.confrelid
            AND target_attribute.attnum = key_column.attnum
          ORDER BY key_column.position
        ) AS columns_to,
        constraint_row.confdeltype::text AS on_delete,
        constraint_row.confupdtype::text AS on_update
      FROM pg_catalog.pg_constraint AS constraint_row
      JOIN pg_catalog.pg_class AS source_table ON source_table.oid = constraint_row.conrelid
      JOIN pg_catalog.pg_class AS target_table ON target_table.oid = constraint_row.confrelid
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = source_table.relnamespace
      WHERE constraint_row.contype = 'f'
        AND namespace.nspname = 'public'
        AND source_table.relname = ANY($1::text[])
      ORDER BY source_table.relname, constraint_row.conname
    `,
    [baselineTableNames],
  );

  const actual = new Map(result.rows.map((entry) => [`${entry.table_from}.${entry.name}`, entry]));
  const expected = new Map(
    Object.values(snapshot.tables).flatMap((table) =>
      Object.values(table.foreignKeys).map((foreignKey) => [`${table.name}.${foreignKey.name}`, foreignKey]),
    ),
  );

  const errors: string[] = [];
  for (const [key, foreignKey] of expected) {
    const current = actual.get(key);
    if (!current) {
      errors.push(`missing foreign key ${key}`);
      continue;
    }

    if (
      current.table_to !== foreignKey.tableTo ||
      !sameValues(current.columns_from, foreignKey.columnsFrom) ||
      !sameValues(current.columns_to, foreignKey.columnsTo) ||
      foreignKeyAction[current.on_delete] !== (foreignKey.onDelete ?? 'no action') ||
      foreignKeyAction[current.on_update] !== (foreignKey.onUpdate ?? 'no action')
    ) {
      errors.push(`foreign key ${key} has an unexpected definition`);
    }
  }
  for (const key of actual.keys()) {
    if (!expected.has(key)) errors.push(`unexpected foreign key ${key}`);
  }
  if (errors.length) fail(errors);
}

async function assertEnums(client: Client) {
  const expectedEnums = Object.values(snapshot.enums);
  const result = await client.query<{ name: string; value: string }>(
    `
      SELECT enum_type.typname AS name, enum_value.enumlabel AS value
      FROM pg_catalog.pg_type AS enum_type
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = enum_type.typnamespace
      JOIN pg_catalog.pg_enum AS enum_value ON enum_value.enumtypid = enum_type.oid
      WHERE namespace.nspname = 'public'
        AND enum_type.typname = ANY($1::text[])
      ORDER BY enum_type.typname, enum_value.enumsortorder
    `,
    [expectedEnums.map((entry) => entry.name)],
  );

  const actual = new Map<string, string[]>();
  for (const row of result.rows) {
    const values = actual.get(row.name) ?? [];
    values.push(row.value);
    actual.set(row.name, values);
  }

  const errors: string[] = [];
  for (const expected of expectedEnums) {
    const values = actual.get(expected.name);
    if (!values) errors.push(`missing enum ${expected.name}`);
    else if (!sameValues(values, expected.values)) errors.push(`enum ${expected.name} has unexpected values`);
  }
  if (errors.length) fail(errors);
}

export async function assertPrismaBaselineCatalog(client: Client) {
  await assertColumns(client);
  await assertIndexes(client);
  await assertForeignKeys(client);
  await assertEnums(client);
}
