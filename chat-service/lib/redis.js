import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import "./env.js";

let pubClient;
let subClient;

export async function connectRedisAdapter(io) {
  const enabled = process.env.REDIS_ENABLED !== "false";
  if (!enabled) {
    console.log("Redis adapter disabled by REDIS_ENABLED=false");
    return false;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  pubClient = createClient({ url: redisUrl });
  subClient = pubClient.duplicate();

  pubClient.on("error", (error) => console.error("Redis pub client error:", error.message));
  subClient.on("error", (error) => console.error("Redis sub client error:", error.message));

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    await pubClient.ping();
    io.adapter(createAdapter(pubClient, subClient));
    console.log(`Socket.IO Redis adapter connected at ${redisUrl}`);
    return true;
  } catch (error) {
    const required = process.env.REDIS_ADAPTER_REQUIRED === "true";
    console.error("Redis adapter connection failed:", error.message);
    if (required) throw error;
    console.warn("Continuing with in-memory Socket.IO adapter. Set REDIS_ADAPTER_REQUIRED=true to fail fast.");
    return false;
  }
}

export async function closeRedisAdapter() {
  await Promise.allSettled([
    subClient?.destroy?.(),
    pubClient?.destroy?.()
  ]);
}
