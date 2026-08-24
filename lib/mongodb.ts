import mongoose from "mongoose";
import { registerModels } from "@/lib/register-models";

const MONGODB_URI = process.env.MONGODB_URI;

const MONGODB_NOT_CONFIGURED = "MONGODB_URI is not configured";

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
      // Fail fast rather than letting an unavailable database block the page.
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
      socketTimeoutMS: 10000,
      // Keep idle sockets around between invocations.
      maxIdleTimeMS: 60000,
      // Prefer IPv4 in the preview/serverless network and let the SRV record
      // select a single reachable Atlas host.
      family: 4,
      // Skip the extra round trip Mongoose otherwise spends auto-building
      // indexes on every cold start; indexes are managed explicitly.
      autoIndex: false,
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
