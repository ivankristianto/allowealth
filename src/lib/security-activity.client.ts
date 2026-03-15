import type { ClientSecurityActivityType } from '@/services/security-activity.service';

interface LogSecurityActivityInput {
  type: ClientSecurityActivityType;
  entityId?: string;
}

export async function logSecurityActivity(input: LogSecurityActivityInput): Promise<void> {
  const response = await fetch('/api/security/activity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    console.warn('Failed to record security activity', {
      status: response.status,
      type: input.type,
      entityId: input.entityId,
    });
  }
}
