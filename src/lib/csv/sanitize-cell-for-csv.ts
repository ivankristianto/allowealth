export function sanitizeCellForCsv(value: unknown): string {
  const stringValue = String(value ?? '');
  const trimmedStart = stringValue.trimStart();
  const leadingCharacter = trimmedStart[0];

  if (leadingCharacter && ['=', '+', '-', '@'].includes(leadingCharacter)) {
    return `'${stringValue}`;
  }

  return stringValue;
}
