import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { mockModuleForFile } from '@/lib/test-helpers/mock-module';
import * as realServices from '@/services';

const exportToCsvMock = mock(() =>
  Promise.resolve('Timestamp,Action,Entity Type,Entity ID,Details')
);

mockModuleForFile('@/services', realServices, () => ({
  auditLogService: {
    exportToCsv: exportToCsvMock,
  },
}));

let GET: any;

function createApiContext(
  user: {
    id: string;
    workspaceId: string | null;
    role: 'admin' | 'member';
  } | null = {
    id: 'user-1',
    workspaceId: 'ws-1',
    role: 'member',
  }
) {
  const url = 'http://localhost/api/security/audit-logs';

  return {
    request: new Request(url, { method: 'GET' }),
    url: new URL(url),
    locals: {
      user,
      session: user ? { token: 'session-token' } : null,
    },
  } as any;
}

describe('API /api/security/audit-logs', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/security/audit-logs'));
  });

  beforeEach(() => {
    exportToCsvMock.mockReset();
    exportToCsvMock.mockResolvedValue('Timestamp,Action,Entity Type,Entity ID,Details');
  });

  it('returns a date-stamped CSV filename', async () => {
    const response = await GET(createApiContext());

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="security-audit-\d{4}-\d{2}-\d{2}\.csv"$/
    );
    expect(exportToCsvMock).toHaveBeenCalledWith('user-1', 'ws-1');
  });
});
