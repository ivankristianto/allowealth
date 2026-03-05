import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('AccountGroupCard IA', () => {
  it('uses concise subtitle text and keeps info tooltip support', () => {
    const content = readFileSync('src/components/organisms/AccountGroupCard.astro', 'utf8');
    expect(content).toContain('Info');
    expect(content).not.toContain(
      'Readily accessible cash — bank accounts, e-wallets, petty cash.'
    );
  });
});
