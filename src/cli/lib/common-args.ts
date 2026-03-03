import { targetArg } from './target';

export const commonArgs = {
  target: targetArg,
  json: {
    type: 'boolean' as const,
    description: 'Output as JSON',
  },
  yes: {
    type: 'boolean' as const,
    alias: 'y' as const,
    description: 'Skip confirmation prompts',
  },
  'workspace-id': {
    type: 'string' as const,
    alias: 'w' as const,
    description: 'Workspace ID',
    required: true,
  },
};
