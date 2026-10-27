import dns from "node:dns";
import mongoose from "mongoose";

try {
  const custom = process.env.DNS_SERVERS;
  const servers = custom ? custom.split(",").map((s) => s.trim()).filter(Boolean) : ["8.8.8.8", "1.1.1.1"];
  dns.setServers(servers);
} catch {
  // Ignore if custom dns servers cannot be set
}
import { validateDatabaseEnv } from "./dbConfig";

const dbValidation = validateDatabaseEnv();
const MONGODB_URI = dbValidation.uri || "mongodb://127.0.0.1:27017/iwms_dev";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  const currentDbValidation = validateDatabaseEnv();
  if (!currentDbValidation.isValid) {
    throw new Error(`Database configuration error: ${currentDbValidation.errors.join("; ")}`);
  }

  const effectiveUri = currentDbValidation.uri || MONGODB_URI;

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 20,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(effectiveUri, opts).then((mongooseInstance) => {
      return mongooseInstance;
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
