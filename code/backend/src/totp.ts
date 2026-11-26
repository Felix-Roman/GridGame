//=============================================================================
// totp.ts
// Makes and checks authenticator app codes (TOTP, RFC 6238) using only Node's built in crypto.
// No outside 2FA library is needed, so there's nothing to keep updated on the AWS server.
//
// How it works: the server and the phone share a secret. Every 30 seconds both of them
// compute HMAC-SHA1(secret, current 30 second count) and turn it into 6 digits.
// If the user's 6 digits match ours, they have the phone.
//=============================================================================
import crypto from 'crypto';

// Base32 is how authenticator apps expect the secret to be written (A–Z and 2–7)
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
// A new code every 30 seconds, 6 digits long. This is what every authenticator app uses
const PERIOD = 30;
const DIGITS = 6;

// Raw bytes -> base32 text. Takes 5 bits at a time and turns each into one letter
function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

// base32 text -> raw bytes, the reverse of the above
function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 character');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// A new random secret: 20 random bytes (160 bits), written as 32 base32 characters
export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

// Which 30 second window we're in right now
export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / PERIOD);
}

// The 6 digit code for one 30 second window
function codeForStep(secret: string, step: number): string {
  // The window number as 8 bytes, big endian, exactly as the standard says
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  // HMAC-SHA1 of the counter, keyed with the secret
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  // "Dynamic truncation": the last 4 bits pick where to read 4 bytes from
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  // Keep the last 6 digits, adding leading zeros (e.g. 5924 -> "005924")
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

// Checks a code the user typed.
// Accepts the window before, now, and after, in case the phone's clock is a few seconds off.
// lastUsedStep blocks reuse: a code that was already accepted can't be used again.
// Returns the matching window number (save it as twoFactorLastStep) or null if it's wrong.
export function verifyCode(secret: string, code: string, lastUsedStep = 0): number | null {
  // Exactly 6 digits, nothing else. This also blocks objects or other junk input
  if (!/^\d{6}$/.test(code)) return null;
  const now = currentStep();
  for (const step of [now - 1, now, now + 1]) {
    if (step <= lastUsedStep) continue;
    // timingSafeEqual compares in constant time so attackers can't learn digits from response timing
    if (crypto.timingSafeEqual(Buffer.from(codeForStep(secret, step)), Buffer.from(code))) return step;
  }
  return null;
}

// The link the QR code holds. Authenticator apps read this to add the account
export function otpauthUri(account: string, secret: string, issuer = 'GridGame'): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(PERIOD) });
  return `otpauth://totp/${label}?${params}`;
}