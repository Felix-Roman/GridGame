//=============================================================================
// User.ts
// This is just the model data that shows MongoDB how to store it's data
//=============================================================================
import { Schema, model } from 'mongoose';

// This is just how the data is stored on the mongoDB instance, will prob need to make something similar for the aws server
const userSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  twoFactorEnabled: { type: Boolean, default: false }, // 2FA fields. Existing users get these defaults automatically, so no migration is needed
  twoFactorSecret: { type: String, default: null }, // Encrypted TOTP secret, set only after the user confirms their first code
  twoFactorPendingSecret: { type: String, default: null }, // Encrypted secret during setup, before the first code is confirmed
  twoFactorLastStep: { type: Number, default: 0 }, // Last 30 second code window that was used, so the same code can't be used twice
  recoveryCodes: { type: [String], default: [] }, // bcrypt hashes of one time backup codes, in case they lose their phone
  createdAt: { type: Date, default: Date.now },
});

export const User = model('User', userSchema);