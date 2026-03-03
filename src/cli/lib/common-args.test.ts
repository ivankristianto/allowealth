import { describe, expect, it } from 'bun:test';
import { commonArgs } from './common-args';
import { targetArg } from './target';

describe('commonArgs', () => {
  it('reuses targetArg', () => {
    expect(commonArgs.target).toBe(targetArg);
  });

  it('defines json flag', () => {
    expect(commonArgs.json).toEqual({
      type: 'boolean',
      description: 'Output as JSON',
    });
  });

  it('defines yes flag with y alias', () => {
    expect(commonArgs.yes).toEqual({
      type: 'boolean',
      alias: 'y',
      description: 'Skip confirmation prompts',
    });
  });

  it('defines required workspace-id with w alias', () => {
    expect(commonArgs['workspace-id']).toEqual({
      type: 'string',
      alias: 'w',
      description: 'Workspace ID',
      required: true,
    });
  });
});
