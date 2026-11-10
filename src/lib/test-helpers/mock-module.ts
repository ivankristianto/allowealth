import { afterAll, mock } from 'bun:test';

type ModuleExports = Record<string, unknown>;

// bun-types does not declare mock.module yet.
const bunMock = mock as unknown as {
  module(specifier: string, factory: () => ModuleExports): void;
};

/**
 * mock.module for one test file. Bun keeps module mocks for every later file and
 * mock.restore() does not undo them, so the real exports are put back in afterAll.
 * Call it at the top level of the test file; `real` is `import * as real from specifier`.
 */
export function mockModuleForFile(
  specifier: `@/${string}` | `@mcp-server/${string}`,
  real: object,
  overrides: () => ModuleExports
): void {
  const realExports: ModuleExports = { ...real };
  bunMock.module(specifier, () => ({ ...realExports, ...overrides() }));
  afterAll(() => {
    bunMock.module(specifier, () => realExports);
  });
}
