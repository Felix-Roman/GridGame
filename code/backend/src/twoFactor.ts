//=============================================================================
// twoFactor.ts
// Routes for turning 2FA on. All of them need a logged in user (requireAuth).
// server.ts mounts this at /api/auth/2fa, so '/setup' becomes /api/auth/2fa/setup
//
// Setup flow:
// POST /setup  -> make a secret, save it ENCRYPTED as "pending", send back a QR code
// POST /enable -> user types the first code from their app; if it's right, 2FA is on
// GET  /status -> { enabled: true/false } for the Account page
//=============================================================================
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import QRCode from 'qrcode';
import { requireAuth, type AuthedRequest } from './auth';
import { User } from './models/User';
import { encryptSecret, decryptSecret } from './crypto2fa';
import { generateSecret, verifyCode, otpauthUri } from './totp';

export const twoFactorRouter = Router();

// Codes are only 6 digits (1,000,000 options), so guessing MUST be limited.
// Same idea as credentialLimiter in auth.ts: only failed attempts count
const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

// GET /api/auth/2fa/status: is 2FA on for this account?
twoFactorRouter.get('/status', requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Account not found' });
  res.json({ enabled: user.twoFactorEnabled });
});

// POST /api/auth/2fa/setup: start setup and get a QR code
twoFactorRouter.post('/setup', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'Account not found' });
    // Already on? They must turn it off first, so nobody can quietly swap the secret
    if (user.twoFactorEnabled) return res.status(400).json({ error: '2FA is already on' });

    // New random secret. It's stored as PENDING, so 2FA isn't on yet
    const secret = generateSecret();
    user.twoFactorPendingSecret = encryptSecret(secret);
    await user.save();

    // The otpauth:// link the authenticator app reads, turned into a QR image
    const uri = otpauthUri(user.username, secret);
    const qr = await QRCode.toDataURL(uri);

    // The secret is also sent as text for people who can't scan, so they can type it into the app instead.
    // This is the ONLY time it is ever sent; afterwards it lives encrypted in the database
    res.json({ qr, secret });
  } catch (err) {
    console.error('[2fa setup]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/2fa/enable { code }: confirm the first code and turn 2FA on
twoFactorRouter.post('/enable', requireAuth, codeLimiter, async (req: AuthedRequest, res) => {
  // Same string only check as auth.ts, which blocks NoSQL-injection objects
  const { code } = req.body ?? {};
  if (typeof code !== 'string') return res.status(400).json({ error: 'Invalid input' });

  try {
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ error: 'Account not found' });
    if (user.twoFactorEnabled) return res.status(400).json({ error: '2FA is already on' });
    if (!user.twoFactorPendingSecret) return res.status(400).json({ error: 'Start setup first' });

    // Decrypt the pending secret and check the code (spaces removed, since some apps show "123 456")
    const secret = decryptSecret(user.twoFactorPendingSecret);
    const step = verifyCode(secret, code.replace(/\s/g, ''));
    if (step === null) return res.status(401).json({ error: 'That code is not right. Check your app and try again.' });

    // It worked: the pending secret becomes the real one and 2FA is on
    user.twoFactorSecret = user.twoFactorPendingSecret;
    user.twoFactorPendingSecret = null;
    user.twoFactorEnabled = true;
    // Remember this window so this exact code can't be used again to log in
    user.twoFactorLastStep = step;
    await user.save();

    res.json({ enabled: true });
  } catch (err) {
    console.error('[2fa enable]', err);
    res.status(500).json({ error: 'Server error' });
  }
});