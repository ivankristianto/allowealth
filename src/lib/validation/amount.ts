import { check, minLength, pipe, regex, string } from 'valibot';

// Sign comes from the transaction type and debts are stored as positive balances, so
// amounts never carry a minus. Two places covers every currency in CURRENCY_META; the
// 15-digit cap keeps the integer part exact when display code converts to a JS number.
export const AMOUNT_PATTERN = /^\d{1,15}(\.\d{1,2})?$/;

const EXAMPLE = '(e.g. 100000 or 100000.50)';

const hasNonZeroDigit = (value: string) => /[1-9]/.test(value);

export function positiveAmountMessage(label = 'Amount'): string {
  return `${label} must be a positive plain number with up to 2 decimal places ${EXAMPLE}`;
}

export function nonNegativeAmountMessage(label = 'Amount'): string {
  return `${label} must be zero or a positive number with up to 2 decimal places ${EXAMPLE}`;
}

export function isValidAmount(value: string, options: { allowZero?: boolean } = {}): boolean {
  return AMOUNT_PATTERN.test(value) && (options.allowZero === true || hasNonZeroDigit(value));
}

/** Canonical form for storage and duplicate keys: no leading zeros, no trailing fraction zeros. */
export function normalizeAmount(value: string): string {
  const [integerPart = '0', fractionPart = ''] = value.split('.');
  const integer = integerPart.replace(/^0+(?=\d)/, '');
  const fraction = fractionPart.replace(/0+$/, '');
  return fraction ? `${integer}.${fraction}` : integer;
}

export function positiveAmountSchema(label = 'Amount') {
  return pipe(
    string(),
    minLength(1, `${label} is required`),
    regex(AMOUNT_PATTERN, positiveAmountMessage(label)),
    check(hasNonZeroDigit, `${label} must be greater than 0`)
  );
}

export function nonNegativeAmountSchema(label = 'Amount') {
  return pipe(
    string(),
    minLength(1, `${label} is required`),
    regex(AMOUNT_PATTERN, nonNegativeAmountMessage(label))
  );
}
