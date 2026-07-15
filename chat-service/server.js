import express from "express";
import "./lib/env.js";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";

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

// store online users
export const userSocketMap = {}; // {userId: socketId}

// socket.io connection handler
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  console.log(`User connected: ${userId}, Socket ID: ${socket.id}`);
  if(userId){
    userSocketMap[userId] = socket.id;
  }
  // Emit event to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Setup terminal for this socket
  setupTerminal(socket);

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userId}, Socket ID: ${socket.id}`);
    if(userId && userSocketMap[userId]){
      delete userSocketMap[userId];
    }
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
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch {
    process.exit(1);
  }
}

startServer();
