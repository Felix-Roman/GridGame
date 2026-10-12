import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

// Initializes the Express application
const app = express();
// middleware for Express to prevent security blocks
app.use(cors());
// This creates a HTTP server that wraps the Express app
const httpServer = createServer(app);
// Init Socket.IO and bind to the HTTP Server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// TypeScript interface defining exactly what data makes up a player's current status.
// This ensures strict type-checking so we don't accidentally send wrong data types.
export interface PlayerState {
  // Unique Socket.io connection ID
  id: string;
  username: string;
  score: number;
  timeSeconds: number;
  battery: number;
  frequency: number;
  pid: {
    main: number;
    sum: number;
    rat: number;
  };
}

// Memory store for active rooms.
// Think of a Map like a C# Dictionary. 
// Outer Map: Key = Room ID, Value = Inner Map.
// Inner Map: Key = Socket ID, Value = PlayerState object.
// Memory store for active rooms: roomId -> Map<socketId, PlayerState>
const rooms = new Map<string, Map<string, PlayerState>>();

// Web Socket.IO
// Event listener triggered every time a new client connects to the server
io.on('connection', (socket: Socket) => {
  // LOCAL variable to remember which room this specific user is currently in
  let currentRoomId: string | null = null;

  // Join Room Handler Section
  // this listenes for that "join_room" event that is sent from the frontend by React
  socket.on('join_room', ({ username, roomId }: { username: string; roomId: string }) => {
    currentRoomId = roomId;
    socket.join(roomId);

    // if this is room doesnt exist yet then create a new room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }

    // grab list of current players in the room
    const roomPlayers = rooms.get(roomId)!;
    
    // Initialize default state for new player
    const newPlayer: PlayerState = {
      id: socket.id,
      // "Player" is the default name is the user's name is somehow null 
      username: username || 'Player',
      score: 0,
      timeSeconds: 0,
      battery: 500,
      frequency: 60.0,
      pid: { main: 200, sum: 10, rat: 0 }
    };

    // adds player to the current list of players in the room.
    roomPlayers.set(socket.id, newPlayer);

    // Broadcast updated player list to everyone in this room
    io.to(roomId).emit('room_players', Array.from(roomPlayers.values()));

    // this logs the method above to the terminal for server monitoring
    console.log(`${username} (${socket.id}) joined room: ${roomId}`);
  });

  // State Update Handler 
  // Listen for state updates from a player's local dashboard
  socket.on('update_state', (updatedData: Partial<PlayerState>) => {
    // ignore updates if a player isnt in a room
    if (!currentRoomId || !rooms.has(currentRoomId)) return;

    // get the room and find the current state of the player
    const roomPlayers = rooms.get(currentRoomId)!;
    const player = roomPlayers.get(socket.id);

    if (player) {
      // Merge updated metrics
      Object.assign(player, updatedData);
      
      // Broadcast updated room state to all clients in the room
      // This is what allows other players to see this user's live grid status
      io.to(currentRoomId).emit('room_players', Array.from(roomPlayers.values()));
    }
  });

  // Disconnect Handler
  // this should trigger when the user closes their tab
  socket.on('disconnect', () => {
    // Check to make sure user was actually in the rooom
    if (currentRoomId && rooms.has(currentRoomId)) {
      const roomPlayers = rooms.get(currentRoomId)!;
      // remove the player from the player list
      roomPlayers.delete(socket.id);

      // if the player list becomes zero then the room is deleted
      if (roomPlayers.size === 0) {
        rooms.delete(currentRoomId);
      } else {
        // if room is not empty then update the roster using Socket.IO
        io.to(currentRoomId).emit('room_players', Array.from(roomPlayers.values()));
      }
    }

    // Log this action
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Backend Port Number the default is 3000
const PORT = process.env.PORT || 3000;

// tells the HTTP Server to start listening for traffic
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});