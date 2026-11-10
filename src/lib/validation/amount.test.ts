import { describe, expect, it } from 'bun:test';
import { safeParse } from 'valibot';
import {
  isValidAmount,
  nonNegativeAmountSchema,
  normalizeAmount,
  positiveAmountSchema,
} from './amount';

const MALFORMED = [
  '1,000',
  '100abc',
  'Infinity',
  'NaN',
  '1e5',
  '0x10',
  ' 100',
  '100 ',
  '.5',
  '5.',
  '1.2.3',
  '-100',
  '+100',
  '100.123',
  '',
  '9'.repeat(16),
];
const VALID = ['1', '100000', '100000.5', '100000.50', '0.01', '999999999999999.99'];

describe('positiveAmountSchema', () => {
  const schema = positiveAmountSchema();

  for (const value of MALFORMED) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      expect(safeParse(schema, value).success).toBe(false);
    });
  }

  for (const value of ['0', '0.00', '00']) {
    it(`rejects zero ${JSON.stringify(value)}`, () => {
      const result = safeParse(schema, value);
      expect(result.success).toBe(false);
      expect(result.issues?.[0]?.message).toBe('Amount must be greater than 0');
    });
  }

  for (const value of VALID) {
    it(`accepts ${JSON.stringify(value)} unchanged`, () => {
      const result = safeParse(schema, value);
      expect(result.success).toBe(true);
      expect(result.output).toBe(value);
    });
  }
});

describe('nonNegativeAmountSchema', () => {
  const schema = nonNegativeAmountSchema('Budget amount');

  for (const value of MALFORMED) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      expect(safeParse(schema, value).success).toBe(false);
    });
  }

  for (const value of ['0', '0.00', ...VALID]) {
    it(`accepts ${JSON.stringify(value)}`, () => {
      expect(safeParse(schema, value).success).toBe(true);
    });
  }
});

describe('isValidAmount', () => {
  it('matches the schemas', () => {
    expect(isValidAmount('100.50')).toBe(true);
    expect(isValidAmount('0')).toBe(false);
    expect(isValidAmount('0', { allowZero: true })).toBe(true);
    expect(isValidAmount('Infinity', { allowZero: true })).toBe(false);
  });
});

describe('normalizeAmount', () => {
  const cases: Array<[string, string]> = [
    ['100', '100'],
    ['100.50', '100.5'],
    ['100.00', '100'],
    ['007.10', '7.1'],
    ['0', '0'],
    ['0.00', '0'],
    ['0.05', '0.05'],
    ['999999999999999.99', '999999999999999.99'],
  ];

  for (const [input, expected] of cases) {
    it(`turns ${input} into ${expected}`, () => {
      expect(normalizeAmount(input)).toBe(expected);
    });
  }
});
