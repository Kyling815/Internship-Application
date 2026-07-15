import mongoose from "mongoose";
import "./env.js";

mongoose.set("bufferCommands", false);

const DEFAULT_DB_NAME = "internship_chat";

function getMongoUri() {
  return process.env.MONGODB_URI || process.env.DB_URI || "";
}

function getMongoDbName(uri) {
  return process.env.MONGODB_DB_NAME || (uri.includes("mongodb+srv://") ? DEFAULT_DB_NAME : undefined);
}

export const connectDB = async () => {
  try {
    const mongoUri = getMongoUri();

    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to DB");
    });
    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err);
    });

    if (!mongoUri) {
      throw new Error("MongoDB connection string is not set. Define MONGODB_URI or DB_URI.");
    }

    if (mongoUri.includes("<") || mongoUri.includes(">")) {
      throw new Error("MongoDB connection string still contains a placeholder.");
    }

    // Newer versions of the MongoDB driver / mongoose no longer accept
    // `useNewUrlParser` and `useUnifiedTopology` options; pass only the
    // connection string or use supported options as needed.
    await mongoose.connect(mongoUri, {
      dbName: getMongoDbName(mongoUri),
      serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error?.message || error);
    throw error;
  }
};
