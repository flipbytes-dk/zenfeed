import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import crypto from 'crypto';

const ENCRYPTION_SECRET = process.env.SOCIAL_TOKEN_SECRET;
if (!ENCRYPTION_SECRET) {
  throw new Error('Missing SOCIAL_TOKEN_SECRET env variable for encryption');
}

const IV_LENGTH = 12; // AES-GCM recommended IV length

/**
 * Encrypt a string using AES-256-GCM
 */
export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.createHash('sha256').update(ENCRYPTION_SECRET!).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt a string using AES-256-GCM
 */
export function decryptToken(encrypted: string): string {
  const data = Buffer.from(encrypted, 'base64');
  const iv = data.slice(0, IV_LENGTH);
  const tag = data.slice(IV_LENGTH, IV_LENGTH + 16);
  const text = data.slice(IV_LENGTH + 16);
  const key = crypto.createHash('sha256').update(ENCRYPTION_SECRET!).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(text, undefined, 'utf8') + decipher.final('utf8');
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
