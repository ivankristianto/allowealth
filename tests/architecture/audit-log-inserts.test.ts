import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const INSERT_INTO_AUDIT_LOGS = /\.insert\(\s*[\w.]*\bauditLogs\s*\)/;
const SOURCE_GLOBS = ['src/**/*.{ts,astro}', 'apps/mcp/src/**/*.ts'];
const NOT_SOURCE = /(\.test\.ts$|\/test-helpers\/|\/__tests__\/)/;

function spreadsActorFields(literal: ts.ObjectLiteralExpression): boolean {
  return literal.properties.some(
    (property) =>
      ts.isSpreadAssignment(property) &&
      ts.isCallExpression(property.expression) &&
      property.expression.expression.getText() === 'auditActorFields'
  );
}

function isAuditRowLiteral(literal: ts.ObjectLiteralExpression): boolean {
  return literal.properties.some(
    (property) => ts.isPropertyAssignment(property) && property.name.getText() === 'entity_type'
  );
}

/** Problems in one file that inserts into audit_logs; empty when every row spreads auditActorFields(). */
function findUnattributedAuditInserts(fileName: string, source: string): string[] {
  if (!INSERT_INTO_AUDIT_LOGS.test(source)) return [];
  if (!source.includes('auditActorFields()')) {
    return [`${fileName}: inserts into auditLogs without spreading auditActorFields()`];
  }
  if (!fileName.endsWith('.ts')) return [];

  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const problems: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isObjectLiteralExpression(node) &&
      isAuditRowLiteral(node) &&
      !spreadsActorFields(node)
    ) {
      const { line } = file.getLineAndCharacterOfPosition(node.getStart());
      problems.push(`${fileName}:${line + 1}: audit row without ...auditActorFields()`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return problems;
}

describe('audit log inserts', () => {
  test('every audit_logs row in the codebase records the acting token', () => {
    const root = process.cwd();
    const files = SOURCE_GLOBS.flatMap((pattern) => [...new Bun.Glob(pattern).scanSync(root)]);
    const inserting = files.filter(
      (file) =>
        !NOT_SOURCE.test(file) &&
        INSERT_INTO_AUDIT_LOGS.test(readFileSync(join(root, file), 'utf8'))
    );
    const problems = inserting.flatMap((file) =>
      findUnattributedAuditInserts(file, readFileSync(join(root, file), 'utf8'))
    );

    expect(inserting).toContain('src/lib/audit-log.ts');
    expect(problems).toEqual([]);
  });

  test('flags a row built without the helper', () => {
    const source = `
      import { auditActorFields } from '@/lib/audit-actor';
      await db.insert(auditLogs).values({ id, action: 'create', entity_type: 'account', ...auditActorFields() });
      rows.push({ id, action: 'delete', entity_type: 'transaction' });
      await db.insert(this.schema.auditLogs).values(rows);
    `;

    expect(findUnattributedAuditInserts('bad.ts', source)).toEqual([
      'bad.ts:4: audit row without ...auditActorFields()',
    ]);
  });

  test('flags a file that never uses the helper', () => {
    const source = `await tx.insert(schema.auditLogs).values(rows);`;

    expect(findUnattributedAuditInserts('bad.ts', source)).toEqual([
      'bad.ts: inserts into auditLogs without spreading auditActorFields()',
    ]);
  });
});
