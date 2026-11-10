---
title: Profile and Security
description: Manage your personal information, secure your account with MFA, and control AI assistant access with connected apps and app passwords.
draft: false
head: []
sidebar:
  label: Profile & Security
  order: 12
audience:
  - user
---

Manage your personal information and secure your account. Access these features from the user menu at the bottom of the sidebar.

## Profile

Update your personal information and manage your email address.

### Update Your Name

1. Navigate to **Profile**
2. Edit the **Full Name** field
3. Click **Save Changes**

Your name appears in transaction records and member lists.

### Change Your Email

1. Navigate to **Profile**
2. Edit the **Email** field
3. Click **Save Changes**
4. Check your new email for a verification link
5. Click the link to confirm the change

**Important:** The change remains pending until you verify the new email. You can continue using Allowealth during this period.

### Cancel Email Change

If you change your mind before verifying:

1. Look for the pending change banner on your Profile page
2. Click **Cancel Change**
3. Your email reverts to the previous address

### Resend Verification Email

If the verification email does not arrive:

1. Wait 60 seconds (rate limit applies)
2. Click **Resend Email**
3. Check spam/junk folders
4. Verify the email address has no typos

## Security

Protect your account with multiple security layers.

### Multi-Factor Authentication (MFA)

MFA requires a second verification step when logging in. Even if someone obtains your password, they cannot access your account without the second factor.

#### Enable MFA

1. Navigate to **Security**
2. Find the **Multi-Factor Authentication** section
3. Click **Enable MFA**
4. Enter your password to confirm
5. Add the setup key to your authenticator app
6. Enter the 6-digit code from the app
7. Click **Verify**

#### Save Backup Codes

After enabling MFA, you receive backup codes:

1. Click **Download** or **Copy** to save them
2. Store in a secure location (password manager or physical safe)
3. Each code works once if you lose access to your authenticator app

**Warning:** Without backup codes, losing your authenticator app can lock you out until you disable and reconfigure MFA from a verified session.

#### Disable MFA

1. Navigate to **Security**
2. Click **Disable MFA**
3. Enter your password
4. Confirm the action

Disabling MFA reduces account security. Keep MFA enabled unless absolutely necessary.

#### Regenerate Backup Codes

1. Navigate to **Security**
2. Click **Regenerate Codes**
3. Enter your password
4. Save the new codes
5. Old codes become invalid

Regenerate codes if you:

- Used most of your backup codes
- Suspect someone obtained your codes
- Lost your stored codes

### Connected Accounts

View accounts linked to your Allowealth login:

- **Google** - Shows status and linked email
- **Connected** - Indicates active link
- **Not Connected** - Available to link

To connect Google:

1. Sign in with your current account method
2. Open **Security**
3. In **Connected Accounts**, click **Connect Account**
4. Complete the Google confirmation flow

To disconnect Google:

1. Open **Security**
2. In **Connected Accounts**, click **Disconnect**
3. Confirm the change

If Google is your only usable sign-in method, Allowealth blocks unlinking to prevent lockout.

### Passkeys

Passkeys provide passwordless login using biometric authentication (fingerprint, face recognition) or hardware security keys.

**Status:** Passkey management is coming soon. The interface shows planned functionality.

### Connected Apps

Connected Apps lists AI assistants you authorized through OAuth, such as Claude Desktop or ChatGPT.

1. Open **Security**
2. In **Connected Apps**, click the assistant you want to connect
3. Approve the consent screen
4. Copy the one-time access token from the confirmation page

These tokens last 24 hours. Signing out of Allowealth disconnects them. Click **Revoke** to disconnect one sooner.

### App Passwords

App passwords are long-lived tokens for scripts, scheduled jobs and AI agents that cannot open a browser to sign in. They work with the MCP endpoint (`/api/mcp`) and the local MCP server. They do not work with the rest of the API.

#### Create an App Password

Creating one needs a sign-in from the last 15 minutes. If your sign-in is older, the dialog offers **Sign in again**. Signing out also disconnects your connected apps.

1. Open **Security**
2. In **App Passwords**, click **Create**
3. Enter a name you will recognize later (for example, "Nightly import script")
4. Choose the access:
   - **Read only** lists accounts, categories, transactions, budgets and the dashboard
   - **Read and write** can also add expenses and income
5. Choose when it expires: 30 days, 90 days, 1 year, or no expiry
6. Click **Create**
7. **Copy the token now.** It starts with `aw_pat_` and is shown only once

Use it as a Bearer token:

```bash
curl -X POST https://your-allowealth-domain.com/api/mcp \
  -H "Authorization: Bearer aw_pat_..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

For the local MCP server, set it as `ALLOWEALTH_ACCESS_TOKEN`.

#### Store App Passwords Securely

- Keep them in a password manager or your CI secret store
- Never commit them to version control
- Never paste them into email or chat
- Prefer **Read only** and an expiry date unless the job needs more

#### Revoke an App Password

1. Find it in the **App Passwords** list
2. Click **Revoke** and confirm

Anything using it loses access on its next request. App passwords are **not** revoked when you sign out or change your password, so revoke them yourself when you stop using them. They also stop working when they expire, when your account is deleted, or when you leave the workspace.

#### What the List Shows

- **Name** you gave it
- **Access**: read only, or read and write
- **Hint**: the first characters of the token, so you can tell tokens apart
- **Created**, **Last used** and **Expires** dates

Creating and revoking app passwords appears in **Recent Activity**.

### Security Events

Recent security activity appears in the **Security Events** section:

- Logins from new devices or locations
- Password changes
- MFA setup or removal
- Passkey registration

Review this log periodically for unauthorized activity.

## Best Practices

### Secure Your Account

1. **Enable MFA** - The single most effective security measure
2. **Use a strong password** - Unique to Allowealth, 12+ characters
3. **Save backup codes** - Store outside Allowealth
4. **Review security events** - Check monthly for suspicious activity
5. **Revoke unused app passwords** - Minimize attack surface

### Email Security

- Use a secure email provider
- Enable MFA on your email account
- Keep your Allowealth email current
- Watch for phishing attempts pretending to be Allowealth

### Device Security

- Log out on shared computers
- Do not save passwords on public devices
- Use device lock screens
- Keep operating systems and browsers updated

## Troubleshooting

### Cannot Enable MFA

1. Ensure you have an authenticator app installed
2. Check your device's camera works for QR scanning
3. Verify your system time is accurate (time drift breaks TOTP codes)
4. Try manual code entry instead of QR scan

### Lost Authenticator App

1. Use a backup code to log in
2. Navigate to Security settings
3. Disable MFA
4. Re-enable MFA with your new device
5. Generate new backup codes

If you have no backup codes and no verified session, you may need help from your workspace administrator.

### App Password Not Working

1. Verify the token is copied completely, including the `aw_pat_` prefix, with no extra spaces
2. Check whether it expired in the **App Passwords** list
3. Confirm it was not revoked
4. A read-only token cannot add expenses or income; create a read-and-write one if the job needs it
5. Create a new app password if necessary

### Email Verification Not Arriving

1. Check spam/junk folders
2. Verify the email address has no typos
3. Wait 5 minutes for delivery
4. Click **Resend** after the cooldown period
5. Try a different email address if problems persist

## Related Features

- **Settings** - Manage workspace preferences and members
- **Profile** - Update personal information
- **API Overview** - Technical reference for the MCP endpoint
