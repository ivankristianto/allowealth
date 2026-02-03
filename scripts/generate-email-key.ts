#!/usr/bin/env bun
/**
 * Generate Email Encryption Key
 *
 * Generates a secure 32-byte encryption key for email API key storage.
 * Add the output to your .env file.
 *
 * Usage: bun run cli:generate-email-key
 */

import { generateEncryptionKey } from '@/lib/crypto/encryption';

console.warn('\n🔐 Email Encryption Key Generator\n');
console.warn('Add the following line to your .env file:\n');

const key = generateEncryptionKey();
console.warn(`EMAIL_ENCRYPTION_KEY=${key}`);

console.warn('\n⚠️  Keep this key secure! If lost, encrypted API keys cannot be recovered.\n');
