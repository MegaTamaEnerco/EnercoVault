import mongoose from 'mongoose';

// Ensure all Mongoose models are registered to avoid MissingSchemaError during .populate()
import '@/models/Role';
import '@/models/Department';
import '@/models/User';
import '@/models/Taxonomy';
import '@/models/Document';
import '@/models/ChangeRequest';
import '@/models/ComplianceFramework';
import '@/models/AuditLog';
import '@/models/SystemSetting';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/enerco-vault';

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      return m;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}
