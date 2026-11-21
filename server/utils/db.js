import mongoose from "mongoose";

const mongoUriError = "MONGODB_URI must be a valid mongodb:// or mongodb+srv:// connection string.";

export function validateMongoUri(uri) {
  if (typeof uri !== "string" || !uri.trim()) {
    throw new Error("MONGODB_URI must be configured before starting the API.");
  }
  try {
    const parsed = new URL(uri.trim());
    if (!["mongodb:", "mongodb+srv:"].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error();
    }
  } catch {
    throw new Error(mongoUriError);
  }
  return uri.trim();
}

mongoose.connection.on("error", () => {
  console.error("MongoDB connection error. Check MONGODB_URI and database network access.");
});
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection was lost.");
});

export async function connectDatabase() {
  const uri = validateMongoUri(process.env.MONGODB_URI);
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });
  } catch {
    throw new Error("Unable to connect to MongoDB. Check MONGODB_URI, network access, and database availability.");
  }
  console.log("MongoDB connected.");
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export async function withMongoTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    if (error?.codeName === "IllegalOperation" || error?.message?.includes("Transaction numbers")) {
      return work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
