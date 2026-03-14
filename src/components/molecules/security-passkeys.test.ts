import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

function readPasskeysCard(): string {
  return readFileSync('src/components/molecules/SecurityPasskeysCard.astro', 'utf-8');
}

function readPasskeysClient(): string {
  return readFileSync('src/components/molecules/security-passkeys.client.ts', 'utf-8');
}

function readLoginForm(): string {
  return readFileSync('src/components/molecules/LoginForm.astro', 'utf-8');
}

describe('SecurityPasskeysCard', () => {
  it('has an enabled Add Passkey button with data-action attribute', () => {
    const source = readPasskeysCard();
    expect(source).toContain('data-action="add-passkey"');
    expect(source).not.toContain('Add Passkey</Button>\n\n  <p');
    // Button should not be disabled
    expect(source).not.toMatch(/Add Passkey.*disabled/s);
  });

  it('has passkeys-list container for dynamic rendering', () => {
    const source = readPasskeysCard();
    expect(source).toContain('id="passkeys-list"');
  });

  it('has delete buttons with data-action and data-passkey-id', () => {
    const source = readPasskeysCard();
    expect(source).toContain('data-action="delete-passkey"');
    expect(source).toContain('data-passkey-id={passkey.id}');
  });

  it('shows empty state message when no passkeys', () => {
    const source = readPasskeysCard();
    expect(source).toContain('No passkeys registered yet');
  });

  it('uses success iconVariant (not warning/under development)', () => {
    const source = readPasskeysCard();
    expect(source).toContain('iconVariant="success"');
    expect(source).not.toContain('Under Development');
    expect(source).not.toContain('iconVariant="warning"');
  });

  it('accepts Passkey objects with optional name field', () => {
    const source = readPasskeysCard();
    expect(source).toContain('name: string | null');
  });

  it('has a delete confirmation dialog modal (not window.confirm)', () => {
    const source = readPasskeysCard();
    expect(source).toContain('delete-passkey-modal');
    expect(source).toContain('data-confirm-delete-passkey');
    expect(source).not.toContain('window.confirm');
  });
});

describe('security-passkeys.client.ts', () => {
  it('calls authClient.passkey.addPasskey()', () => {
    const source = readPasskeysClient();
    expect(source).toContain('authClient.passkey.addPasskey()');
  });

  it('calls authClient.passkey.deletePasskey()', () => {
    const source = readPasskeysClient();
    expect(source).toContain('authClient.passkey.deletePasskey({ id: passkeyId })');
  });

  it('calls authClient.passkey.listUserPasskeys()', () => {
    const source = readPasskeysClient();
    expect(source).toContain('authClient.passkey.listUserPasskeys()');
  });

  it('re-renders the list after add or delete', () => {
    const source = readPasskeysClient();
    expect(source).toContain('refreshPasskeyList');
  });

  it('shows success toast on registration', () => {
    const source = readPasskeysClient();
    expect(source).toContain("addToast('Passkey registered successfully'");
  });

  it('handles user cancellation gracefully without window.confirm', () => {
    const source = readPasskeysClient();
    expect(source).toContain('Registration cancelled');
    expect(source).toContain('isCancellationError');
    expect(source).not.toContain('window.confirm');
  });

  it('uses a dialog modal for delete confirmation', () => {
    const source = readPasskeysClient();
    expect(source).toContain('delete-passkey-modal');
    expect(source).toContain('data-confirm-delete-passkey');
    expect(source).toContain('showModal()');
  });
});

describe('SecurityPasskeysCard demo mode', () => {
  it('accepts demoMode prop', () => {
    const source = readPasskeysCard();
    expect(source).toContain('demoMode?: boolean');
  });

  it('shows "Disabled in demo" message when demoMode is true', () => {
    const source = readPasskeysCard();
    expect(source).toContain('Disabled in demo');
    expect(source).toContain('data-testid="passkey-demo-disabled"');
  });

  it('conditionally renders add button based on demoMode', () => {
    const source = readPasskeysCard();
    // Should have conditional rendering for the add button
    expect(source).toMatch(/demoMode\s*\?\s*.*:.*data-action="add-passkey"/s);
  });

  it('conditionally renders delete buttons based on demoMode', () => {
    const source = readPasskeysCard();
    // Delete button should be wrapped in {!demoMode && (...)}
    expect(source).toMatch(/!demoMode.*data-action="delete-passkey"/s);
  });
});

describe('LoginForm passkey support', () => {
  it('has Sign in with Passkey button', () => {
    const source = readLoginForm();
    expect(source).toContain('passkey-signin-btn');
    expect(source).toContain('Sign in with Passkey');
  });

  it('sets autocomplete="username webauthn" on email field', () => {
    const source = readLoginForm();
    expect(source).toContain("autocomplete', 'username webauthn'");
  });

  it('calls authClient.signIn.passkey()', () => {
    const source = readLoginForm();
    expect(source).toContain('authClient.signIn.passkey()');
  });

  it('supports conditional UI autofill via isConditionalMediationAvailable', () => {
    const source = readLoginForm();
    expect(source).toContain('isConditionalMediationAvailable');
    expect(source).toContain('autoFill: true');
  });

  it('uses showInfoAlert helper to reduce duplication', () => {
    const source = readLoginForm();
    expect(source).toContain('showInfoAlert');
  });

  it('uses isPasskeyCancellation to detect NotAllowedError and cancellation', () => {
    const source = readLoginForm();
    expect(source).toContain('isPasskeyCancellation');
    expect(source).toContain('NotAllowedError');
  });
});
