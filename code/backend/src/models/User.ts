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
  createdAt: { type: Date, default: Date.now },
});

export const User = model('User', userSchema);