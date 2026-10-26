// Small helpers for the /api/games routes.
// This file wraps one fetch request, "create a game" POST /api/games handled by games.ts on the server in a function that's easy to use
// Lobby.tsx calls createGame() and gets back either { id } or { error }

import { API_URL } from './AuthContext';

// One row in the "Active games" list (matches GameSummary in backend/src/games.ts
export interface GameSummary {
  id: string;
  name: string;
  host: string;
  isPublic: boolean;
  playerCount: number;
  maxPlayers: number | null; // null = no limit
  players: string[];
  createdAt: number;
}

// What Lobby.tsx sends when creating a game, the body of the POST request
export interface NewGame {
  name: string;
  hostName: string;
  isPublic: boolean;
  password?: string;
}

// Creates a game on the server
// It returns a Promise
// Lobby.tsx checks which one it got with, if ('error' in result)
export async function createGame(game: NewGame): Promise<{ id: string } | { error: string }> {
  try {
    const res = await fetch(`${API_URL}/api/games`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.id === 'string') return { id: data.id };
    return { error: data.error ?? 'Could not create the game' };
  } catch {
    return { error: 'Cannot reach the server' };
  }
}
