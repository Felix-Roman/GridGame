// Opens a Socket.IO connection to the backend (same address as the page by default).
import { io, type Socket } from 'socket.io-client';
import { API_URL } from './AuthContext';

export function connectSocket(): Socket {
  // withCredentials sends the login cookie so the server knows who you are.
  return API_URL ? io(API_URL, { withCredentials: true }) : io({ withCredentials: true });
}
