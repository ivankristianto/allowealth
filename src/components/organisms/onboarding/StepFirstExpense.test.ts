import { describe, expect, it } from 'bun:test';

describe('StepFirstExpense amount formatting', () => {
  it('wires amount formatter and account-currency sync', async () => {
    const source = await Bun.file(
      new URL('./StepFirstExpense.astro', import.meta.url).pathname
    ).text();

    expect(source).toContain('attachAmountFormatter');
    expect(source).toContain("accountSelect?.addEventListener('change'");
    expect(source).toContain('formatter.updateCurrency');
  });
});
