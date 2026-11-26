//=============================================================================
// crypto2fa.ts
// Encrypts and decrypts 2FA secrets before they go into or come out of MongoDB.
// If someone ever copies the database, they still can't make 2FA codes without TWO_FACTOR_KEY.
//=============================================================================
import crypto from 'crypto';
import { config } from './config';

// Turn the 64 hex characters from .env into the 32 raw bytes AES-256 needs
const KEY = Buffer.from(config.twoFactorKey, 'hex');

// AES-256-GCM encrypts the secret AND adds a tag that detects if anyone changed it
// Stored as "iv.tag.ciphertext" in hex so it fits in one string field
export function encryptSecret(plain: string): string {
  // A new random IV every time, so the same secret never encrypts to the same text twice
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((b) => b.toString('hex')).join('.');
}

// Reverses encryptSecret. Throws an error if the stored text was altered or the key is wrong
export function decryptSecret(stored: string): string {
  const [iv, tag, data] = stored.split('.').map((h) => Buffer.from(h, 'hex'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}