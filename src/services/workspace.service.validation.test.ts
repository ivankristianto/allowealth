import { describe, expect, it } from 'bun:test';
import type { IDatabase } from '@/db';
import { WorkspaceService } from './workspace.service';

const fakeDb = {} as unknown as IDatabase;

describe('WorkspaceService validation', () => {
  const service = new WorkspaceService(fakeDb);

  it('rejects an empty workspace name', async () => {
    await expect(service.create({ name: '' })).rejects.toThrow('Workspace name is required');
  });

  it('rejects workspace names longer than 255 characters', async () => {
    await expect(service.create({ name: 'a'.repeat(256) })).rejects.toThrow(
      'Workspace name must be less than 255 characters'
    );
  });
});
