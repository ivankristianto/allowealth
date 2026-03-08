import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const read = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

describe('reports overview refinement', () => {
  it('uses a short intro card on the overview page', () => {
    const reportsPage = read('src/pages/reports/index.astro');

    expect(reportsPage).toContain(
      'Review this period at a glance, then open Income or Expenses for the full breakdown.'
    );
    expect(reportsPage).not.toContain('How to use this page');
    expect(reportsPage).not.toContain('1. Check coverage');
  });

  it('uses concise preview card copy and direct CTA labels', () => {
    const previews = read('src/components/partials/OverviewPreviewCardsPartial.astro');

    expect(previews).toContain('See the largest income sources for the selected period.');
    expect(previews).toContain('See the spending categories with the biggest impact.');
    expect(previews).toContain('View income breakdown');
    expect(previews).toContain('View expense breakdown');
    expect(previews).not.toContain('for deeper investigation');
    expect(previews).not.toContain('so you can immediately see');
  });
});
