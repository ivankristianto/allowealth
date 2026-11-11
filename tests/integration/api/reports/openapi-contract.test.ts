import { beforeAll, describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createMemoryDb, seedWorkspaceOwner } from '@/db/test-helpers/memory-db';
import { ReportService } from '@/services/report.service';

// The report routes send the service result as `data` unchanged, so the service output is the wire shape
interface Schema {
  $ref?: string;
  allOf?: Schema[];
  type?: string;
  nullable?: boolean;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  additionalProperties?: boolean | Schema;
}

interface ResolvedSchema {
  schema: Schema;
  file: string;
}

const SCHEMA_DIR = join(process.cwd(), 'openapi/schemas');

function resolve(schema: Schema, file: string): ResolvedSchema {
  if (!schema.$ref) return { schema, file };
  const [path, pointer] = schema.$ref.split('#/');
  const target = path ? join(dirname(file), path) : file;
  const doc = Bun.YAML.parse(readFileSync(target, 'utf8')) as Record<string, Schema>;
  return resolve(doc[pointer], target);
}

function merge(schema: Schema, file: string): ResolvedSchema {
  const resolved = resolve(schema, file);
  if (!resolved.schema.allOf) return resolved;
  const parts = resolved.schema.allOf.map((part) => merge(part, resolved.file));
  return {
    file: resolved.file,
    schema: {
      type: 'object',
      properties: Object.assign({}, ...parts.map((part) => part.schema.properties)),
      required: parts.flatMap((part) => part.schema.required ?? []),
    },
  };
}

/** Every mismatch between a JSON value and its OpenAPI schema, as `path: problem`. */
function contractViolations(value: unknown, schema: Schema, file: string, path = 'data'): string[] {
  const { schema: s, file: at } = merge(schema, file);
  if (value === null) return s.nullable ? [] : [`${path}: null but not nullable`];

  if (s.type === 'array') {
    if (!Array.isArray(value)) return [`${path}: expected array`];
    return value.flatMap((item, i) => contractViolations(item, s.items ?? {}, at, `${path}[${i}]`));
  }
  if (s.type === 'object' || s.properties) {
    if (typeof value !== 'object' || Array.isArray(value)) return [`${path}: expected object`];
    const record = value as Record<string, unknown>;
    const properties = s.properties ?? {};
    const problems = (s.required ?? [])
      .filter((key) => !(key in record))
      .map((key) => `${path}.${key}: required but missing`);
    for (const [key, child] of Object.entries(record)) {
      if (key in properties) {
        if (child !== undefined) {
          problems.push(...contractViolations(child, properties[key], at, `${path}.${key}`));
        }
      } else if (s.properties && s.additionalProperties !== true) {
        problems.push(`${path}.${key}: returned but not documented`);
      }
    }
    return problems;
  }
  if (s.type === 'integer') return Number.isInteger(value) ? [] : [`${path}: expected integer`];
  if (s.type && s.type !== typeof value) return [`${path}: expected ${s.type}`];
  return [];
}

function checkAgainst(schemaFile: string, pointer: string, data: unknown): string[] {
  const file = join(SCHEMA_DIR, schemaFile);
  return contractViolations(JSON.parse(JSON.stringify(data)), { $ref: `#/${pointer}` }, file);
}

const WORKSPACE = 'ws-contract';
const OWNER = 'user-contract';
const PERIOD = '2026-03';

describe('OpenAPI contract: reports endpoints', () => {
  let service: ReportService;

  beforeAll(() => {
    const { db, raw } = createMemoryDb();
    seedWorkspaceOwner(raw, WORKSPACE, OWNER);
    raw.run(
      `INSERT INTO accounts (id, workspace_id, created_by_user_id, name, type, balance, currency)
       VALUES ('acc-1', ?, ?, 'Cash', 'cash', '1000000', 'IDR')`,
      [WORKSPACE, OWNER]
    );
    raw.run(
      `INSERT INTO budget_categories (id, workspace_id, created_by_user_id, name, type, income_source_type)
       VALUES ('cat-food', ?, ?, 'Food', 'expense', 'other'),
              ('cat-salary', ?, ?, 'Salary', 'income', 'active')`,
      [WORKSPACE, OWNER, WORKSPACE, OWNER]
    );
    // transaction_date is a drizzle `timestamp` column, stored in seconds
    const midMonth = Math.floor(new Date(2026, 2, 10, 12).getTime() / 1000);
    raw.run(
      `INSERT INTO transactions (id, workspace_id, created_by_user_id, category_id, account_id, type, amount, currency, description, transaction_date)
       VALUES ('tx-1', ?, ?, 'cat-food', 'acc-1', 'expense', '50000', 'IDR', 'Lunch', ?),
              ('tx-2', ?, ?, 'cat-salary', 'acc-1', 'income', '9000000', 'IDR', 'March pay', ?)`,
      [WORKSPACE, OWNER, midMonth, WORKSPACE, OWNER, midMonth]
    );
    service = new ReportService(db);
  });

  it('every documented path points at a schema file that exists', () => {
    const paths = readFileSync(join(process.cwd(), 'openapi/paths/reports.yml'), 'utf8');
    for (const route of ['/api/reports:', '/api/reports/expenses:', '/api/reports/income:']) {
      expect(paths).toContain(route);
    }
  });

  it('GET /api/reports matches OverviewReportData', async () => {
    const data = await service.getOverviewReport(WORKSPACE, PERIOD, 'monthly', 'IDR');
    expect(data.incomePreview.topCategories.length).toBeGreaterThan(0);
    expect(checkAgainst('OverviewReportData.yml', 'OverviewReportData', data)).toEqual([]);
  });

  it('GET /api/reports/expenses matches ReportData', async () => {
    const data = await service.getExpenseReport(WORKSPACE, PERIOD, 'monthly', 'IDR');
    expect(data.expenseByCategory.length).toBeGreaterThan(0);
    expect(checkAgainst('ReportData.yml', 'ReportData', data)).toEqual([]);
  });

  it('GET /api/reports/income matches IncomeReportData', async () => {
    const data = await service.getIncomeReport(WORKSPACE, PERIOD, 'monthly', 'IDR');
    expect(data.history.transactions.length).toBeGreaterThan(0);
    expect(checkAgainst('IncomeReportData.yml', 'IncomeReportData', data)).toEqual([]);
  });

  it('flags missing required and undocumented keys', () => {
    const schema: Schema = {
      type: 'object',
      properties: { total: { type: 'string' } },
      required: ['total'],
    };
    expect(contractViolations({ extra: 1 }, schema, SCHEMA_DIR)).toEqual([
      'data.total: required but missing',
      'data.extra: returned but not documented',
    ]);
  });
});
