/**
 * Returns the value thrown by `fn`, or `null` if it returned normally.
 *
 * `expect(...).toThrow()` is typed to accept only a string or RegExp in this
 * project, so asserting on an error class goes through `toBeInstanceOf`.
 */
export function thrown(fn: () => unknown): unknown {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
}
