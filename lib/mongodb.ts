import mongoose from "mongoose";
import { registerModels } from "@/lib/register-models";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://admin:pVFlUkFuz3ii80RB@stb.3d0fv9t.mongodb.net/sabkatechbazar";

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

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Reuse a warm pool across serverless invocations instead of paying a new
      // TCP + TLS handshake per request.
      maxPoolSize: 10,
      minPoolSize: 1,
      // Fail fast rather than letting a request hang for the 30s default.
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000,
      // Keep idle sockets around between invocations.
      maxIdleTimeMS: 60000,
      // Skip the extra round trip Mongoose otherwise spends auto-building
      // indexes on every cold start; indexes are managed explicitly.
      autoIndex: false,
      compressors: ["zlib" as const],
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
