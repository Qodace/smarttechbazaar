import mongoose from "mongoose";
import { registerModels } from "@/lib/register-models";

// Accept either variable name. Different environments provision the Mongo
// connection string under a different key: local/self-hosted setups typically
// use MONGODB_URI, while the managed project environment injects it as
// MONGODB_CONNECTION_STRING. Reading both means the app connects in every
// environment instead of silently falling back to empty result sets.
const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGODB_CONNECTION_STRING;

const MONGODB_NOT_CONFIGURED =
  "MongoDB connection string is not configured. Set MONGODB_URI or MONGODB_CONNECTION_STRING.";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
   
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  // Ensure every Mongoose model is registered before any query/populate runs.
  // This prevents "MissingSchemaError: Schema hasn't been registered for
  // model ..." errors that occur when a referenced model (e.g. Category) was
  // tree-shaken out of a route's bundle.
  registerModels();

  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error(MONGODB_NOT_CONFIGURED);
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Reuse a warm pool across serverless invocations instead of paying a new
      // TCP + TLS handshake per request.
      maxPoolSize: 10,
      minPoolSize: 0,
      // A cold Atlas connection costs ~2s (DNS SRV + TCP + TLS + auth), and
      // opening additional pool sockets can be considerably slower. The old 3s
      // budget sat right on top of that, so sockets were killed mid-handshake
      // ("connection ... timed out") and queries silently returned nothing —
      // which surfaced in the UI as "No products found" despite a healthy DB.
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // Keep idle sockets around between invocations.
      maxIdleTimeMS: 60000,
      // Prefer IPv4 in the preview/serverless network and let the SRV record
      // select a single reachable Atlas host.
      family: 4,
      // Skip the extra round trip Mongoose otherwise spends auto-building
      // indexes on every cold start; indexes are managed explicitly.
      autoIndex: false,
      // Let the driver transparently retry a read/write whose socket dropped
      // mid-flight instead of bubbling up a transient network error that the
      // page-level catch would turn into an empty list.
      retryReads: true,
      retryWrites: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
