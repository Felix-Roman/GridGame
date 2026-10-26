// =============================================================================
// server.ts
// Starts Express, Socket.IO, and MongoDB
//
// One server one port 3000 by default
// Because the site and API share one address, it works the same on localhost and through a Cloudflare Tunnel
// or on an AWS server once it can be fully tested and implimented.
//
// This is the file Node runs ("npm run dev" / "npm start")
// Every other backend file is a part while this one assembles them
// first it Creates the Express app
// then it adds steps every request passes through like security headers, reading JSON, reading cookies
// it adds the routes /api/health, /api/auth/..., /api/games, then the website itself
// a error handler at the very end
// Wrap it all in an HTTP server and attach Socket.IO to the same server
// Connect to MongoDB, THEN start listening for visitors
// shut down cleanly when needed
//
// HOW A REQUEST TRAVELS, THIS IS SUPER DUPER IMPORTANT GUYS
// Express runs app.use or app.get entries in the order they're written
// each one either answers (res.json, res.send...) which ends the journey
// or it calls next() to pass the request further down
// So order matters a **** ton here in this file
// =============================================================================

// Settings from backend/.env Importing config.ts runs it, which loads .env, so it must come first
// the other files read config values when they load.
import { config } from './config';
import fs from 'fs';
import path from 'path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { connectDB } from './db';
import { authRouter } from './auth';
import { gamesRouter } from './games';
import { attachGameSockets } from './gameSocket';

// Creates the Express application so I can add middleware and routes to it
const app = express();


// Behind Cloudflare/nginx the visitor's real IP and https status arrive in X-Forwarded-* headers
// This tells Express to believe them rate limits and Secure cookies depend on it
// config.trustProxy is 'loopback' by default: only believe those headers from programs on this machine
app.set('trust proxy', config.trustProxy);

// app.use(fn) runs fn for EVERY request. Helmet goes first so every reply gets its security headers
app.use(
  // Call helmet with custom settings
  helmet({
    // The Content Security Policy tells the browser which sources the page may load scripts images and connections from
    // If an attacker injected a script from elsewhere then the browser refuses it
    contentSecurityPolicy: {
      // I'm changing two of Helmet's default rules here ~ Michael
      directives: {
        // Don't force https as an AWS server reached by plain http://IP:3000 would break
        // This rule makes browsers rewrite http:// links to https:// null removes that feature
        'upgrade-insecure-requests': null,
        // Allow the Socket.IO websocket back to this same server
        'connect-src': ["'self'", 'ws:', 'wss:'],
      },
    },
  }),
);

// Only needed if the frontend is hosted somewhere else
const corsOptions = config.clientOrigin ? { origin: config.clientOrigin, credentials: true } : undefined;

// Switch CORS on only when it's configured
if (corsOptions) app.use(cors(corsOptions));

// Read JSON request bodies into req.body
// 20kb limit rejects anything bigger, so nobody can tie up the server with a huge upload
app.use(express.json({ limit: '20kb' }));
// Read the Cookie header into req.cookies (auth.ts uses req.cookies.token).
app.use(cookieParser());


// GET /api/health: a quick "is everything ok or are things maybe on fire" check
app.get('/api/health', (_req, res) => {
  // readyState 1 means "connected" in Mongoose 0 = disconnected, 2 = connecting, 3 = disconnecting
  res.json({ ok: true, db: mongoose.connection.readyState === 1 });
});

// Everything starting with /api/auth goes to auth.ts router
app.use('/api/auth', authRouter);
// Everything starting with /api/games goes to games.ts's router
app.use('/api/games', gamesRouter);
// Any other /api/ path didn't match above, so it doesn't exist: reply 404 as JSON
app.use('/api', (_req, res) => {
  // 404 is "Not Found", I think this is pretty common one but Ima comment it anyways
  res.status(404).json({ error: 'Not found' });
});


// The full path to the built site's main page   frontend/dist/index.html
// partially why npm run build is needed for large changes
const indexHtml = path.join(config.frontendDist, 'index.html');


// Only serve the website if it has been built
if (fs.existsSync(indexHtml)) {
  // Serve the built files directly
  app.use(express.static(config.frontendDist));
  // React Router handles paths like /Account or /game/ksddgksd, so send index.html for them
  app.use((req, res, next) => {
    // Only for page loads (GET) and HEAD the same minus the body, Anything else passes on
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    // Send the React app
    res.sendFile(indexHtml);
  });
} else {
  // Visiting http://localhost:3000/ shows a plain-text explanation instead of an error
  app.get('/', (_req, res) => {
    res
      .type('text')
      .send(
        'Grid Game API is running.\n\n' +
          'No built website found. Either run `npm run build` (then restart), ' +
          'or for development open the Vite dev server at http://localhost:5173.',
      );
  });
}

// Errors (bad JSON bodies, unexpected crashes) become a JSON reply instead of an HTML page
// Express recognizes an error handler by its FOUR parameters (err, req, res, next)
// only runs it when something earlier failed so It must be added last
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // express.json() couldn't read the body error code 400 "Bad Request"
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  // The body was over the 20 KB limit error code 413 "Payload Too Large"
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  // Anything else is a bug
  console.error(err);
  // give the browser a generic message never internal details
  res.status(500).json({ error: 'Server error' });
});

// HTTP server and Socket.IO
// Wrap Express in a plain Node HTTP server, we need direct access to it so Socket.IO can share it
const httpServer = createServer(app);
// Attach Socket.IO to the SAME server, so the website, the API and the live connection all use one port
const io = new Server(httpServer, {
  // The same CORS rules as the API
  cors: corsOptions,
  // The biggest message a browser may send. Ours are supposed to be tiny this stops someone sending huge ones
  maxHttpBufferSize: 100_000,
});
// Set up all the game events and the broadcast loop
const stopSockets = attachGameSockets(io);

// Connect to MongoDB first, connectDB returns a Promise, so we say what to do when it finishes.
connectDB()
  // .then() runs if mongoDB connects
  .then(() => {
    // Start accepting visitors on the configured port and address
    httpServer.listen(config.port, config.host, () => {
      // The startup message in the terminal
      console.log(`Grid Game server listening on http://localhost:${config.port}`);
      // A reminder when only the API is running
      if (!fs.existsSync(indexHtml)) console.log('(API only: website not built yet)');
    });
  })
  .catch((err) => {
    // Print the error message
    console.error(err.message ?? err);
    // Stop the program Exit code 1 means "failed"
    process.exit(1);
  });

// Clean shutdown
// Set to true once shutdown starts, so pressing Ctrl+C twice doesn't run it twice

let stopping = false;
// "signal" is the name of what asked us to stop (shown in the message).
function shutdown(signal: string) {
  // Already shutting down then Ignore
  if (stopping) return;
  // Remember we've started
  stopping = true;

  // Say what's happening on the terminal
  console.log(`${signal} received, shutting down...`);

  // Stop the 4-times-a-second broadcast loop
  stopSockets();

  // io.close() also closes the HTTP server
  // Close every socket and stop accepting new visitors
  io.close(() => {
    // Disconnect from MongoDB cleanly
    mongoose.disconnect().finally(() => process.exit(0));
  // Closes io.close.
  });

  // if closing hangs exit anyway after 5 seconds
  // unref() means this timer alone won't keep the program running
  setTimeout(() => process.exit(0), 5000).unref();
}

// Meant for the AWS connection, not fully made
// SIGINT = "interrupt", sent when you press Ctrl+C in the terminal.
process.on('SIGINT', () => shutdown('SIGINT'));
// SIGTERM = "terminate", sent by pm2 (on AWS) and other tools when they restart or stop the server.
process.on('SIGTERM', () => shutdown('SIGTERM'));