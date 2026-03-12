export function isPerfDebugEnabled(
  perfDebugValue: string | null | undefined,
  isDevRuntime: boolean
): boolean {
  return isDevRuntime && perfDebugValue === 'true';
}
