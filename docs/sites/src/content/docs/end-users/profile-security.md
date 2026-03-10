---
title: Profile and Security
description: Manage your personal information, secure your account with MFA, and control access with API keys.
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

### API Keys

Generate API keys to access Allowealth from external applications and scripts.

#### Create an API Key

1. Navigate to **Security**
2. Find the **API Keys** section
3. Click **Generate API Key**
4. Enter a descriptive name (for example, "Personal Scripts")
5. Optionally set an expiration date
6. Click **Generate**
7. **Copy the key immediately** - it displays only once

#### Store API Keys Securely

- Use a password manager
- Never commit keys to version control
- Never share keys in email or chat
- Treat keys like passwords

#### Revoke an API Key

1. Find the key in the API Keys list
2. Click **Revoke**
3. Confirm the action

Revoked keys lose access immediately. Applications using the key will fail.

#### View Key Usage

The API Keys list shows:

- **Name** - Description you provided
- **Prefix** - First few characters of the key (for identification)
- **Created** - When you generated it
- **Last Used** - Most recent access
- **Expires** - Expiration date (if set)

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
5. **Revoke unused API keys** - Minimize attack surface

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

### API Key Not Working

1. Verify the key is copied completely (no extra spaces)
2. Check if the key expired
3. Confirm the key was not revoked
4. Generate a new key if necessary

### Email Verification Not Arriving

1. Check spam/junk folders
2. Verify the email address has no typos
3. Wait 5 minutes for delivery
4. Click **Resend** after the cooldown period
5. Try a different email address if problems persist

## Related Features

- **Settings** - Manage workspace preferences and members
- **Profile** - Update personal information
- **API Documentation** - Technical reference for API key usage
