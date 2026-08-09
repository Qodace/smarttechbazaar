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
  // eslint-disable-next-line no-var
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
