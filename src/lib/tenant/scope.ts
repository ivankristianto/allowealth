export function assertWorkspace(expectedWorkspaceId: string, actualWorkspaceId: string): void {
  if (expectedWorkspaceId !== actualWorkspaceId) {
    throw new Error(
      `Workspace scope violation: expected ${expectedWorkspaceId}, got ${actualWorkspaceId}`
    );
  }
}
