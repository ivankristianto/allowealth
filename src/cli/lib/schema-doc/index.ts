/* eslint-disable no-console -- CLI output is intentional */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import * as schema from '@/db/schema/sqlite';
// Deprecated MFA tables still exist in the database but are no longer exported from the schema index.
import * as userMfa from '@/db/schema/sqlite/user-mfa';
import * as userMfaBackupCodes from '@/db/schema/sqlite/user-mfa-backup-codes';
import { financialCoreFigure, identityFigure, moneyLanesFigure } from './figures';
import { collectTables, countIndexes, findGroupingProblems, renderReference } from './reference';

export const DEFAULT_SCHEMA_DOC_PATH = 'docs/architecture/database-schema.html';

export function generateSchemaDoc(generatedAt: Date = new Date()): string {
  const tables = collectTables([schema, userMfa, userMfaBackupCodes]);
  const problems = findGroupingProblems(tables.keys());
  if (problems.ungrouped.length || problems.unknown.length || problems.duplicated.length) {
    throw new Error(
      `Schema doc table groups are out of date (src/cli/lib/schema-doc/reference.ts): ` +
        `ungrouped=[${problems.ungrouped.join(', ')}] unknown=[${problems.unknown.join(', ')}] ` +
        `duplicated=[${problems.duplicated.join(', ')}]`
    );
  }

  const template = readFileSync(new URL('./template.html', import.meta.url), 'utf8');
  const generatedLabel = generatedAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return template
    .replace('{{FIG_FINANCIAL_CORE}}', financialCoreFigure())
    .replace('{{FIG_MONEY_LANES}}', moneyLanesFigure())
    .replace('{{FIG_IDENTITY}}', identityFigure())
    .replace('{{REFERENCE}}', renderReference(tables))
    .replaceAll('{{TABLE_COUNT}}', String(tables.size))
    .replaceAll('{{INDEX_COUNT}}', String(countIndexes(tables)))
    .replace('{{GENERATED_AT}}', generatedLabel);
}

export function runSchemaDocCommand(args: { out?: string }): void {
  const outputPath = resolve(args.out ?? DEFAULT_SCHEMA_DOC_PATH);
  const html = generateSchemaDoc();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html);
  console.log(
    `✅ Wrote ${relative(process.cwd(), outputPath)} (${Math.round(html.length / 1024)} KB)`
  );
}
