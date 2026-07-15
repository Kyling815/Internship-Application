import express from "express";
import "./lib/env.js";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import { closeRedisAdapter, connectRedisAdapter } from "./lib/redis.js";

import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import groupRouter from "./routes/groupRoutes.js";
import { setupTerminal } from "./controller/terminalController.js";

import { Server } from "socket.io";
const app = express();
const server = http.createServer(app);
const chatCorsOrigin = process.env.CHAT_CORS_ORIGIN || "http://localhost:5173";

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "chat-service",
    timestamp: new Date().toISOString(),
  });
});

// Socket.io setup
export const io = new Server(server, {
  cors: {
    origin: chatCorsOrigin,
    // methods: ["GET", "POST"],
  },
}); 

// Store online users by every stable alias we know about:
// chat DynamoDB _id, upstream app user id, and email.
export const userSocketMap = {}; // {userAlias: socketId}
const socketAliasMap = new Map(); // {socketId: string[]}

function getSocketAliases(socket) {
  const { userId, chatUserId, appUserId, email } = socket.handshake.query || {};
  return [...new Set([userId, chatUserId, appUserId, email]
    .flat()
    .filter(Boolean)
    .map((value) => String(value)))];
}

// socket.io connection handler
io.on("connection", (socket) => {
  const aliases = getSocketAliases(socket);
  const userId = aliases[0];

  console.log(`User connected: ${aliases.join(", ") || "anonymous"}, Socket ID: ${socket.id}`);
  if(aliases.length){
    socketAliasMap.set(socket.id, aliases);
    aliases.forEach((alias) => {
      userSocketMap[alias] = socket.id;
    });
  }
  // Emit event to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Setup terminal for this socket
  setupTerminal(socket);

  socket.on("disconnect", () => {
    const registeredAliases = socketAliasMap.get(socket.id) || aliases;
    console.log(`User disconnected: ${registeredAliases.join(", ") || "anonymous"}, Socket ID: ${socket.id}`);
    registeredAliases.forEach((alias) => {
      if(userSocketMap[alias] === socket.id){
        delete userSocketMap[alias];
      }
    });
    socketAliasMap.delete(socket.id);
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});
// Middleware
app.use(express.json(
  {
    limit: '4mb'
  }
));
app.use(cors({ origin: chatCorsOrigin }));

app.use("/api/status", (req, res) => {
  res.json({ status: "Server is running" });
});
app.use("/api/auth", userRouter);
app.use("/api/users", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/groups", groupRouter);


const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    await connectRedisAdapter(io);
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch {
    process.exit(1);
  }
}

startServer();

async function shutdown() {
  await closeRedisAdapter();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
