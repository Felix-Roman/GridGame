//=============================================================================
// GameResult.ts
// One saved game for the leaderboards: who played, what they scored, and how long their grid stayed up before it tripped
// gameSocket.ts saves one of these the moment a signed in player's grid trips
// Guests are never saved, because they have no lasting name
// leaderboard.ts reads them back and works out each player's stats
//=============================================================================
import { Schema, model } from 'mongoose';

const gameResultSchema = new Schema({
  // The account name of the player, "index: true" makes looking up one player's games fast
  username: { type: String, required: true, trim: true, index: true },
  // Which game room it was played in with the id from games.ts
  gameId: { type: String, required: true },
  // Money at the moment the grid tripped, the same number as "Final score" on the Game Over card
  score: { type: Number, required: true },
  // How long the grid stayed up, in seconds
  timeSeconds: { type: Number, required: true, min: 0 },
  // When the game ended, Indexed so "This week"/"Today" can find recent games quickly
  endedAt: { type: Date, default: Date.now, index: true },
});

// Stops the same game from being saved twice.
// If a player's connection drops and reconnects after their grid tripped,
// the browser sends "tripped: true" again with the same score and time letting this unique index that is used later on by
// MongoDB refuse that second copy
gameResultSchema.index({ username: 1, gameId: 1, score: 1, timeSeconds: 1 }, { unique: true });

export const GameResult = model('GameResult', gameResultSchema);
