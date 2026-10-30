const NAME_KEY = 'gg-guest-name';
const PLAYER_KEY = 'gg-player-key';
const passKey = (gameId: string) => `gg-pass-${gameId}`;

function read(store: () => Storage, key: string): string | null {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
}
function write(store: () => Storage, key: string, value: string) {
  try {
    store().setItem(key, value);
  } catch {
    /* storage blocked: the app still works, it just won't remember */
  }
}
const local = () => window.localStorage;
const session = () => window.sessionStorage;

export const getGuestName = (): string => read(local, NAME_KEY) ?? '';
export const setGuestName = (name: string) => write(local, NAME_KEY, name.trim());

let memoryKey = '';
export function getPlayerKey(): string {
  const saved = read(session, PLAYER_KEY) || memoryKey;
  if (saved) return saved;
  // crypto.getRandomValues works on plain http too (crypto.randomUUID needs https).
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  memoryKey = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  write(session, PLAYER_KEY, memoryKey);
  return memoryKey;
}

export const rememberGamePassword = (gameId: string, password: string) => write(session, passKey(gameId), password);
export const getGamePassword = (gameId: string): string | undefined => read(session, passKey(gameId)) ?? undefined;
