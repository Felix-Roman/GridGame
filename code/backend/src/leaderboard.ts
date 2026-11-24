//=============================================================================
// leaderboard.ts
// Everything for the Leaderboards page on the server side,
//   saveGameResult()        gameSocket.ts calls this when a signed in player's grid trips
//   GET/api/leaderboard     Pages/Leaderboards.tsx calls this to get every player's stats
// We only ever save single games, The four leaderboard stats are worked out
// from those games each time the page asks, so they can never get out of sync,
//   highScore        the biggest score of any one game
//   highScoreTime    how long that high score game lasted
//   totalEarned      every game's score added together
//   longestSurvived  the longest timeSeconds of any one game
//   gamesPlayed      how many games were saved
//=============================================================================

import { Router } from 'express';
import { GameResult } from './models/GameResult';

// What gameSocket.ts hands us when a grid trips
export interface FinishedGame {
  username: string;
  gameId: string;
  score: number;
  timeSeconds: number;
}

// Saves one finished game, "async" because writing to MongoDB takes a moment
// It never throws, a failed save is printed in the terminal, but it must never crash the game server
export async function saveGameResult(game: FinishedGame): Promise<void> {
  try {
    await GameResult.create({
      username: game.username,
      gameId: game.gameId,
      // Whole dollars and whole seconds, the same way the Game Over card shows them
      score: Math.floor(game.score),
      timeSeconds: Math.floor(game.timeSeconds),
    });
  } catch (err) {
    // Error code 11000 means "duplicate key", the unique index in GameResult.ts
    // refused a second copy of a game we already saved, That's expected, so stay quiet
    if ((err as { code?: number }).code === 11000) return;
    console.error('Could not save game result:', (err as Error).message);
  }
}

// The "Period" dropdown on the page sends one of these
type Period = 'all' | 'week' | 'today';

// Turns a period into the oldest date that still counts, or null for "all time"
function periodStart(period: Period): Date | null {
  const now = new Date();
  if (period === 'today') {
    // Midnight at the start of today
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === 'week') {
    // Exactly 7 days ago: 7 days * 24 hours * 60 minutes * 60 seconds * 1000 ms
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return null;
}

// The most players we send back
const MAX_PLAYERS = 500;

// server.ts mounts this at /api/leaderboard
export const leaderboardRouter = Router();

// GET /api/leaderboard?period=all|week|today
// Public: guests can look at the leaderboards too, so there's no requireAuth here
leaderboardRouter.get('/', async (req, res, next) => {
  try {
    // Anything other than "week" or "today" means "all"
    const p = req.query.period;
    const period: Period = p === 'week' || p === 'today' ? p : 'all';
    const since = periodStart(period);

    // An "aggregation pipeline": MongoDB runs these stages in order, each one
    // working on what the stage before it handed over, Think of it as an assembly line
    const rows = await GameResult.aggregate([
      // 1. Keep only games inside the chosen period ({} = keep everything)
      { $match: since ? { endedAt: { $gte: since } } : {} },

      // 2. Put each player's best game first, highest score, and for a tie the
      //    shorter time
      { $sort: { score: -1, timeSeconds: 1 } },

      // 3. Squash all of a player's games into one row ("_id" is what we group by)
      {
        $group: {
          _id: '$username',
          // Because of step 2, the first game in each group is their best one
          highScore: { $first: '$score' },
          highScoreTime: { $first: '$timeSeconds' },
          // Add up every game's score
          totalEarned: { $sum: '$score' },
          // The longest single game
          longestSurvived: { $max: '$timeSeconds' },
          // Count the games, add 1 for each
          gamesPlayed: { $sum: 1 },
        },
      },

      // 4. Biggest high score first, then cap the list
      { $sort: { highScore: -1 } },
      { $limit: MAX_PLAYERS },

      // 5. Rename "_id" to "name" and drop "_id", so each row matches
      //    LeaderboardEntry in frontend/src/api.ts exactly
      {
        $project: {
          _id: 0,
          name: '$_id',
          highScore: 1,
          highScoreTime: 1,
          totalEarned: 1,
          longestSurvived: 1,
          gamesPlayed: 1,
        },
      },
    ]);

    // The page resorts this for whichever ranking the player picks
    res.json({ period, entries: rows });
  } catch (err) {
    // Hand the error to the error handler at the bottom of server.ts
    next(err);
  }
});
