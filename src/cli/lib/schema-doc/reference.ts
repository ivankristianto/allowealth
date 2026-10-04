import { is, Table } from 'drizzle-orm';
import { getTableConfig, type SQLiteColumn, type SQLiteTable } from 'drizzle-orm/sqlite-core';
import { escapeHtml } from './svg';

export interface TableGroup {
  title: string;
  note: string;
  tables: string[];
}

/**
 * Every SQL table in the schema must appear in exactly one group;
 * findGroupingProblems() fails generation (and its test) when a table is added
 * without being placed here.
 */
export const TABLE_GROUPS: TableGroup[] = [
  {
    title: 'Budgeting & ledger',
    note: 'Categories, monthly budgets and every recorded expense, income or transfer.',
    tables: ['budget_categories', 'budgets', 'transactions'],
  },
  {
    title: 'Recurring',
    note: 'Templates generate dated occurrences; confirming one writes a transaction.',
    tables: ['recurring_templates', 'recurring_occurrences'],
  },
  {
    title: 'Accounts & net worth',
    note: 'What the household holds or owes, and how that changed over time.',
    tables: [
      'accounts',
      'account_categories',
      'account_history',
      'account_update_reminders',
      'account_snapshots',
      'account_snapshot_items',
    ],
  },
  {
    title: 'Workspaces & users',
    note: 'The tenant boundary, its members, their preferences and the audit trail.',
    tables: [
      'workspaces',
      'workspace_meta',
      'workspace_invitations',
      'users',
      'user_meta',
      'audit_logs',
    ],
  },
  {
    title: 'Better Auth',
    note: 'Identity, sessions, credentials and MCP OAuth clients. Shape is dictated by Better Auth.',
    tables: [
      'user',
      'session',
      'account',
      'verification',
      'twoFactor',
      'passkey',
      'oauthApplication',
      'oauthAccessToken',
      'oauthConsent',
    ],
  },
  {
    title: 'Legacy',
    note: 'Lucia-era tables kept for migration cleanup. Not the source of truth for auth.',
    tables: [
      'sessions',
      'password_reset_tokens',
      'email_verification_tokens',
      'oauth_accounts',
      'user_mfa',
      'user_mfa_backup_codes',
    ],
  },
];

/** Decimal amounts stored as text; rendered in the money colour. */
const MONEY_COLUMNS = new Set([
  'amount',
  'balance',
  'initial_balance',
  'credit_limit',
  'budget_amount',
  'confirmed_amount',
]);

/** Collect every Drizzle table from the given schema modules, keyed by SQL table name. */
export function collectTables(modules: Record<string, unknown>[]): Map<string, SQLiteTable> {
  const tables = new Map<string, SQLiteTable>();
  for (const module of modules) {
    for (const value of Object.values(module)) {
      if (is(value, Table)) {
        const table = value as SQLiteTable;
        tables.set(getTableConfig(table).name, table);
      }
    }
  }
  return tables;
}

export function findGroupingProblems(
  tableNames: Iterable<string>,
  groups: TableGroup[] = TABLE_GROUPS
): { ungrouped: string[]; unknown: string[]; duplicated: string[] } {
  const schemaNames = new Set(tableNames);
  const grouped = groups.flatMap((group) => group.tables);
  const seen = new Set<string>();
  const duplicated = grouped.filter((name) => (seen.has(name) ? true : (seen.add(name), false)));
  return {
    ungrouped: [...schemaNames].filter((name) => !seen.has(name)),
    unknown: [...seen].filter((name) => !schemaNames.has(name)),
    duplicated,
  };
}

export function describeColumnType(column: SQLiteColumn): string {
  if (column.columnType === 'SQLiteText' && column.enumValues?.length) {
    return column.enumValues.join(' | ');
  }
  switch (column.columnType) {
    case 'SQLiteTimestamp':
      return 'mode' in column && column.mode === 'timestamp_ms' ? 'timestamp (ms)' : 'timestamp';
    case 'SQLiteBoolean':
      return 'boolean';
    case 'SQLiteInteger':
      return 'integer';
    case 'SQLiteText':
      return MONEY_COLUMNS.has(column.name) ? 'decimal as text' : 'text';
    default:
      return column.getSQLType();
  }
}

function describeDefault(column: SQLiteColumn): string {
  if (!column.hasDefault || column.default === undefined) return '';
  const value: unknown = column.default;
  // SQL expressions (sqliteTimestampNow) and Date defaults are both "now".
  if (
    value instanceof Date ||
    (typeof value === 'object' && value !== null && 'queryChunks' in value)
  ) {
    return 'now';
  }
  return JSON.stringify(value);
}

function renderTableCard(name: string, table: SQLiteTable): string {
  const config = getTableConfig(table);
  const foreignKeys = new Map<string, { table: string; onDelete?: string }>();
  for (const foreignKey of config.foreignKeys) {
    const reference = foreignKey.reference();
    const [column] = reference.columns;
    if (column) {
      foreignKeys.set(column.name, {
        table: getTableConfig(reference.foreignTable).name,
        onDelete: foreignKey.onDelete,
      });
    }
  }

  const rows = config.columns
    .map((column) => {
      const foreignKey = foreignKeys.get(column.name);
      const badges: string[] = [];
      if (column.primary) badges.push('<span class="b b-pk">PK</span>');
      if (foreignKey) {
        const onDelete =
          foreignKey.onDelete && foreignKey.onDelete !== 'no action'
            ? ` · ${foreignKey.onDelete}`
            : '';
        badges.push(`<span class="b b-fk">→ ${escapeHtml(foreignKey.table + onDelete)}</span>`);
      }
      if (column.isUnique) badges.push('<span class="b">unique</span>');
      const defaultValue = describeDefault(column);
      const nameClass = column.notNull ? 'c-name' : 'c-name c-null';
      const typeClass = MONEY_COLUMNS.has(column.name) ? 'c-type c-money' : 'c-type';
      const defaultHtml = defaultValue
        ? ` <span class="c-def">= ${escapeHtml(defaultValue)}</span>`
        : '';
      return `<tr><td class="${nameClass}">${escapeHtml(column.name)}</td><td class="${typeClass}">${escapeHtml(describeColumnType(column))}${defaultHtml}</td><td class="c-flags">${badges.join(' ')}</td></tr>`;
    })
    .join('');

  const columnNames = (columns: unknown[]) =>
    columns.map((column) =>
      typeof column === 'object' && column !== null && 'name' in column
        ? String(column.name)
        : 'expr'
    );
  const indexes = [
    ...config.indexes.map((index) => ({
      columns: columnNames(index.config.columns),
      unique: index.config.unique,
    })),
    ...config.uniqueConstraints.map((constraint) => ({
      columns: columnNames(constraint.columns),
      unique: true,
    })),
  ];
  const notable = indexes
    .filter((index) => index.columns.length > 1 || index.unique)
    .map((index) => escapeHtml(`${index.unique ? 'unique ' : ''}(${index.columns.join(', ')})`));
  const indexHtml = indexes.length
    ? `<p class="t-idx"><span>${indexes.length} index${indexes.length === 1 ? '' : 'es'}</span>${notable.length ? ' · ' + notable.join(' · ') : ''}</p>`
    : '';

  return `<article class="t" id="t-${escapeHtml(name)}"><h4><code>${escapeHtml(name)}</code><span class="t-count">${config.columns.length} cols</span></h4><div class="t-scroll"><table><tbody>${rows}</tbody></table></div>${indexHtml}</article>`;
}

export function renderReference(
  tables: Map<string, SQLiteTable>,
  groups: TableGroup[] = TABLE_GROUPS
): string {
  return groups
    .map((group) => {
      const cards = group.tables
        .map((name) => {
          const table = tables.get(name);
          if (!table) throw new Error(`Table "${name}" is grouped but not in the schema`);
          return renderTableCard(name, table);
        })
        .join('');
      return `<section class="ref-group"><div class="ref-head"><h3>${escapeHtml(group.title)}</h3><p>${escapeHtml(group.note)}</p></div><div class="ref-grid">${cards}</div></section>`;
    })
    .join('');
}

export function countIndexes(tables: Map<string, SQLiteTable>): number {
  let total = 0;
  for (const table of tables.values()) {
    const config = getTableConfig(table);
    total += config.indexes.length + config.uniqueConstraints.length;
  }
  return total;
}
