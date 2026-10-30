// =============================================================================
// db.ts
// Connects the server to MongoDB, the database where user accounts are stored.
//
// MongoDB is a separate program (a Windows service on a PC, "mongod" on AWS) 
// This server talks to it over a network connection, the same way a browser talks to a website. 
// Mongoose is the library that opens that connection and lets me use models like User.ts instead of writing raw database commands.
// server.ts calls connectDB() once at startup and only starts accepting visitors after it succeeds, so the site never runs without its database.
// =============================================================================

// this is the library that connects to MongoDB and provides models
import mongoose from 'mongoose';
// The settings from config.ts I only need config.mongoUri, the database's address
import { config } from './config';

// Hides the password part of a connection string before printing it.
// A MongoDB address can contain a password like in mongodb+srv://michael:PASSWORD@cluster0.mongodb.net/gridgame
// That is not my password, don't test it, please.
// uri.replace(pattern, replacement) finds the part matching the pattern and replaces it.
// The replacement '//$1:****@' puts back the slashes, group 1 (the username), and **** instead of the password.
// Result: mongodb+srv://michael:****@cluster0.mongodb.net/gridgame
// A local address like mongodb://127.0.0.1:27017/gridgame has no "@", so the pattern doesn't match and it's printed unchanged.
const redact = (uri: string) => uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:****@');

// The function server.ts calls at startup
// "export" = other files can import it.
// "async" = it does slow work and returns a Promise that a value that arrives later, so server.ts can wait for it with .then()
export async function connectDB() {
  // mongoose.connection is the live connection. .on(event, function)
  // If the database goes away later if MongoDB stopped or the network dropped then print a warning in the terminal
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  // Mongoose keeps retrying by itself 
  // When it gets back in then it prints that its back up.
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
  try {
    // Fail after 10 seconds with a clear message instead of hanging forever
    // "await" pauses this function (not the whole server) until the connection succeeds or fails
    // serverSelectionTimeoutMS is how long to keep trying to find the database before giving up
    // 10_000 is just 10 seconds the underscore is allowed in numbers to make them easier to read, who knew huh?
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10_000 });
  // If connect failed, "err" holds the reason.
  } catch (err) {
    // Throw a NEW, friendlier error that doesnt look scary and server.ts catches it, prints the message, and stops the server.
    throw new Error(
      // which address the server tried with any password hidden
      `Could not connect to MongoDB at ${redact(config.mongoUri)}.\n` +
        // the most likely fix there is a space "+" joins the strings together
        'Is MongoDB running? (Windows: check the "MongoDB" service; Linux: sudo systemctl status mongod)\n' +
        // if all else fails Mongoose's original technical message, Shows the poor developer a warning
        // err as Error tells TypeScript to treat err as an Error so we can read its .message.
        `Details: ${(err as Error).message}`,
    );
  }
  // Only reached when connect succeeded but a thrown error can skip this line
  console.log('MongoDB connected');
}
