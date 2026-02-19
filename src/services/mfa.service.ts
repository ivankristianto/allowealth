/**
 * MFA Service
 *
 * Manages TOTP-based multi-factor authentication lifecycle:
 * setup, verification, backup codes, and disabling.
 */

import { and, eq, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createTOTPKeyURI, verifyTOTPWithGracePeriod } from '@oslojs/otp';
import { createLogger } from '@/lib/logger';
import { getActiveSchema, runTransaction, type IDatabase } from '@/db';
import { getEnv } from '@/lib/env';
import { logAuditEvent } from '@/lib/audit-log';
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode as verifyBackupCodeHash,
} from '@/lib/auth/mfa-crypto';

const log = createLogger('mfa');

const MFA_ISSUER = 'allowealth';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_GRACE_PERIOD_SECONDS = 30;

/**
 * Get the MFA encryption key from environment.
 * Reuses EMAIL_ENCRYPTION_KEY for TOTP secret encryption.
 */
function getEncryptionKey(): string {
  const key = getEnv('EMAIL_ENCRYPTION_KEY');
  if (!key || key === 'your-32-byte-key-base64-encoded') {
    throw new Error('EMAIL_ENCRYPTION_KEY must be set for MFA encryption');
  }
  return key;
}

export interface MfaStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
  backupCodesRemaining: number;
}

export interface MfaSetupResult {
  qrCodeDataUrl: string;
  manualEntryCode: string;
}

export class MfaService {
  private schema = getActiveSchema();

  constructor(private db: IDatabase) {}

  /**
   * Initialize MFA setup for a user.
   */
  async initSetup(userId: string, userEmail: string, workspaceId: string): Promise<MfaSetupResult> {
    const encryptionKey = getEncryptionKey();

    // Generate 20-byte secret (160-bit)
    const secretBytes = crypto.getRandomValues(new Uint8Array(20));

    const totpUri = createTOTPKeyURI(
      MFA_ISSUER,
      userEmail,
      secretBytes,
      TOTP_PERIOD_SECONDS,
      TOTP_DIGITS
    );

    const manualEntryCode = base32Encode(secretBytes);
    const encryptedSecret = await encryptTotpSecret(manualEntryCode, encryptionKey);

    const existing = await this.db.query.userMfa.findFirst({
      where: eq(this.schema.userMfa.user_id, userId),
    });

    if (existing?.mfa_enabled) {
      throw new Error('MFA is already enabled. Disable it first to re-setup.');
    }

    if (existing) {
      await this.db
        .update(this.schema.userMfa)
        .set({
          totp_secret: encryptedSecret,
          updated_at: new Date(),
        })
        .where(eq(this.schema.userMfa.id, existing.id));
    } else {
      await this.db.insert(this.schema.userMfa).values({
        id: nanoid(),
        user_id: userId,
        mfa_enabled: false,
        totp_secret: encryptedSecret,
      });
    }

    const QRCode = await import('qrcode');
    const qrCodeDataUrl = await QRCode.toDataURL(totpUri);

    log.info(`MFA setup initiated for user ${userId}`);
    void logAuditEvent({
      workspaceId,
      userId,
      action: 'mfa_setup_init',
      entityType: 'user_mfa',
      entityId: userId,
    });

    return {
      qrCodeDataUrl,
      manualEntryCode,
    };
  }

  /**
   * Verify initial setup by checking a TOTP code and enable MFA.
   * Returns plaintext backup codes for one-time display.
   */
  async verifySetup(userId: string, totpCode: string, workspaceId: string): Promise<string[]> {
    const mfaRecord = await this.getMfaRecord(userId);
    if (!mfaRecord) {
      throw new Error('No MFA setup found. Start setup first.');
    }
    if (mfaRecord.mfa_enabled) {
      throw new Error('MFA is already enabled.');
    }

    const isValid = await this.validateTotpCode(mfaRecord.totp_secret, totpCode);
    if (!isValid) {
      throw new Error('Invalid verification code. Please try again.');
    }

    const backupCodes = await runTransaction(this.db, async (tx) => {
      const codes = await this.generateAndStoreBackupCodes(mfaRecord.id, tx);

      await tx
        .update(this.schema.userMfa)
        .set({
          mfa_enabled: true,
          updated_at: new Date(),
        })
        .where(eq(this.schema.userMfa.id, mfaRecord.id));

      return codes;
    });

    log.info(`MFA enabled for user ${userId}`);
    void logAuditEvent({
      workspaceId,
      userId,
      action: 'mfa_enable',
      entityType: 'user_mfa',
      entityId: userId,
      newValue: { backupCodesGenerated: 10 },
    });

    return backupCodes;
  }

  /**
   * Get MFA status for a user.
   */
  async getStatus(userId: string): Promise<MfaStatus> {
    const mfaRecord = await this.getMfaRecord(userId);

    if (!mfaRecord || !mfaRecord.mfa_enabled) {
      return {
        enabled: false,
        hasBackupCodes: false,
        backupCodesRemaining: 0,
      };
    }

    const backupCodes = await this.db.query.userMfaBackupCodes.findMany({
      where: and(
        eq(this.schema.userMfaBackupCodes.user_mfa_id, mfaRecord.id),
        isNull(this.schema.userMfaBackupCodes.used_at)
      ),
    });

    return {
      enabled: true,
      hasBackupCodes: backupCodes.length > 0,
      backupCodesRemaining: backupCodes.length,
    };
  }

  /**
   * Check if MFA is enabled for a user. Used during login flow.
   */
  async isMfaEnabled(userId: string): Promise<boolean> {
    const mfaRecord = await this.getMfaRecord(userId);
    return mfaRecord?.mfa_enabled === true;
  }

  /**
   * Verify a TOTP code during login.
   */
  async verifyTotp(userId: string, code: string): Promise<boolean> {
    const mfaRecord = await this.getMfaRecord(userId);
    if (!mfaRecord || !mfaRecord.mfa_enabled) {
      return false;
    }

    return this.validateTotpCode(mfaRecord.totp_secret, code);
  }

  /**
   * Verify and consume a backup code during login.
   * Returns true if code is valid and consumed.
   */
  async verifyAndConsumeBackupCode(userId: string, code: string): Promise<boolean> {
    const mfaRecord = await this.getMfaRecord(userId);
    if (!mfaRecord || !mfaRecord.mfa_enabled) {
      return false;
    }

    const backupCodes = await this.db.query.userMfaBackupCodes.findMany({
      where: and(
        eq(this.schema.userMfaBackupCodes.user_mfa_id, mfaRecord.id),
        isNull(this.schema.userMfaBackupCodes.used_at)
      ),
    });

    for (const backupCode of backupCodes) {
      const isValid = await verifyBackupCodeHash(code, backupCode.code_hash);
      if (!isValid) {
        continue;
      }

      const updatedRows = await this.db
        .update(this.schema.userMfaBackupCodes)
        .set({ used_at: new Date() })
        .where(
          and(
            eq(this.schema.userMfaBackupCodes.id, backupCode.id),
            isNull(this.schema.userMfaBackupCodes.used_at)
          )
        )
        .returning({ id: this.schema.userMfaBackupCodes.id });

      if (updatedRows.length === 0) {
        // Concurrent request consumed this code first.
        continue;
      }

      log.info(`Backup code consumed for user ${userId}`);
      return true;
    }

    return false;
  }

  /**
   * Disable MFA for a user. Requires valid TOTP or backup code.
   */
  async disable(userId: string, code: string, workspaceId: string): Promise<void> {
    const isTotpValid = await this.verifyTotp(userId, code);
    const isBackupCodeValid = !isTotpValid && (await this.verifyAndConsumeBackupCode(userId, code));

    if (!isTotpValid && !isBackupCodeValid) {
      throw new Error('Invalid verification code.');
    }

    const mfaRecord = await this.getMfaRecord(userId);
    if (!mfaRecord) {
      throw new Error('MFA is not configured.');
    }

    await this.db
      .delete(this.schema.userMfaBackupCodes)
      .where(eq(this.schema.userMfaBackupCodes.user_mfa_id, mfaRecord.id));

    await this.db.delete(this.schema.userMfa).where(eq(this.schema.userMfa.id, mfaRecord.id));

    log.info(`MFA disabled for user ${userId}`);
    void logAuditEvent({
      workspaceId,
      userId,
      action: 'mfa_disable',
      entityType: 'user_mfa',
      entityId: userId,
    });
  }

  /**
   * Regenerate backup codes. Requires a valid TOTP code.
   */
  async regenerateBackupCodes(
    userId: string,
    totpCode: string,
    workspaceId: string
  ): Promise<string[]> {
    const isValid = await this.verifyTotp(userId, totpCode);
    if (!isValid) {
      throw new Error('Invalid verification code.');
    }

    const mfaRecord = await this.getMfaRecord(userId);
    if (!mfaRecord || !mfaRecord.mfa_enabled) {
      throw new Error('MFA is not enabled.');
    }

    await this.db
      .delete(this.schema.userMfaBackupCodes)
      .where(eq(this.schema.userMfaBackupCodes.user_mfa_id, mfaRecord.id));

    const backupCodes = await this.generateAndStoreBackupCodes(mfaRecord.id);

    log.info(`Backup codes regenerated for user ${userId}`);
    void logAuditEvent({
      workspaceId,
      userId,
      action: 'mfa_backup_regenerate',
      entityType: 'user_mfa',
      entityId: userId,
      newValue: { codesGenerated: 10 },
    });

    return backupCodes;
  }

  private async getMfaRecord(userId: string) {
    return this.db.query.userMfa.findFirst({
      where: eq(this.schema.userMfa.user_id, userId),
    });
  }

  private async validateTotpCode(encryptedSecret: string, code: string): Promise<boolean> {
    const encryptionKey = getEncryptionKey();
    const secretBase32 = await decryptTotpSecret(encryptedSecret, encryptionKey);
    const secretBytes = base32Decode(secretBase32);

    const normalizedCode = code.trim();
    return verifyTOTPWithGracePeriod(
      secretBytes,
      TOTP_PERIOD_SECONDS,
      TOTP_DIGITS,
      normalizedCode,
      TOTP_GRACE_PERIOD_SECONDS
    );
  }

  private async generateAndStoreBackupCodes(
    mfaId: string,
    db: IDatabase = this.db
  ): Promise<string[]> {
    const backupCodes = generateBackupCodes();
    const rows = await Promise.all(
      backupCodes.map(async (backupCode) => ({
        id: nanoid(),
        user_mfa_id: mfaId,
        code_hash: await hashBackupCode(backupCode),
      }))
    );
    await db.insert(this.schema.userMfaBackupCodes).values(rows);

    return backupCodes;
  }
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(bytes: Uint8Array): string {
  let result = '';
  let buffer = 0;
  let bitsLeft = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;

    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += BASE32_ALPHABET[(buffer >> bitsLeft) & 0x1f];
    }
  }

  if (bitsLeft > 0) {
    result += BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 0x1f];
  }

  return result;
}

function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/=+$/g, '');
  const output: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (const char of cleaned) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) {
      continue;
    }

    buffer = (buffer << 5) | value;
    bitsLeft += 5;

    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      output.push((buffer >> bitsLeft) & 0xff);
    }
  }

  return new Uint8Array(output);
}
