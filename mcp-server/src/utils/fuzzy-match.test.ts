import { describe, it, expect } from 'bun:test';
import { fuzzyMatch } from './fuzzy-match';

describe('fuzzyMatch', () => {
  const options = ['Food & Drinks', 'Transport', 'Shopping', 'Entertainment', 'Salary'];

  it('should match exactly (case-insensitive)', () => {
    expect(fuzzyMatch('food & drinks', options)).toBe('Food & Drinks');
    expect(fuzzyMatch('TRANSPORT', options)).toBe('Transport');
  });

  it('should match by substring', () => {
    expect(fuzzyMatch('food', options)).toBe('Food & Drinks');
    expect(fuzzyMatch('enter', options)).toBe('Entertainment');
  });

  it('should match with typos via Levenshtein distance', () => {
    expect(fuzzyMatch('Transprt', options)).toBe('Transport');
    expect(fuzzyMatch('Shoping', options)).toBe('Shopping');
  });

  it('should return null for no match', () => {
    expect(fuzzyMatch('xyz', options)).toBeNull();
    expect(fuzzyMatch('', options)).toBeNull();
  });

  it('should return null for empty options', () => {
    expect(fuzzyMatch('food', [])).toBeNull();
  });

  it('should prefer exact match over substring', () => {
    const opts = ['Cash', 'Cash IDR', 'Petty Cash'];
    expect(fuzzyMatch('Cash', opts)).toBe('Cash');
  });

  it('should prefer substring over Levenshtein', () => {
    const opts = ['BCA Digital', 'BCA'];
    expect(fuzzyMatch('BCA', opts)).toBe('BCA');
  });
});
