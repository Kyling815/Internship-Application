import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const DB_URI = process.env.DB_URI || "";

export const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to DB");
    });
    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err);
    });
    if (!DB_URI) {
      console.error("DB_URI is not set. Skipping MongoDB connection.");
      return;
    }

    // Newer versions of the MongoDB driver / mongoose no longer accept
    // `useNewUrlParser` and `useUnifiedTopology` options; pass only the
    // connection string or use supported options as needed.
    await mongoose.connect(DB_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};
