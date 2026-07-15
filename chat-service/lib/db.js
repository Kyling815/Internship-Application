import { ensureDynamoDB } from "./dynamo.js";

export const connectDB = async () => {
  try {
    await ensureDynamoDB();
  } catch (error) {
    console.error("Error connecting to DynamoDB:", error?.message || error);
    throw error;
  }
};
