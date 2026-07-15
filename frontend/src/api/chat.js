import axios from "axios";
import { io as createSocket } from "socket.io-client";

import { getStoredToken } from "./client";

export const CHAT_API_BASE_URL = (import.meta.env.VITE_CHAT_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

export const chatApi = axios.create({
  baseURL: CHAT_API_BASE_URL
});

export function createChatSocket(user, chatUser) {
  return createSocket(CHAT_API_BASE_URL, {
    query: {
      userId: chatUser?._id || `fastapi:${user?.id || ""}`,
      chatUserId: chatUser?._id || "",
      appUserId: chatUser?.appUserId || `fastapi:${user?.id || ""}`,
      email: chatUser?.email || user?.email || ""
    }
  });
}

function encodeHeaderText(value) {
  return encodeURIComponent(String(value || ""));
}

export function buildChatUserHeaders(user) {
  if (!user) return {};

  const displayName = user.full_name || user.email?.split("@")[0] || "User";

  return {
    "X-User-Id": String(user.id),
    "X-User-Email": user.email || "",
    "X-User-Name": encodeHeaderText(displayName),
  };
}

chatApi.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

export function getChatUsers(user) {
  return chatApi.get("/api/messages/users", {
    headers: buildChatUserHeaders(user)
  });
}

export function getCurrentChatUser(user) {
  return chatApi.get("/api/auth/check-auth", {
    headers: buildChatUserHeaders(user)
  });
}

export function getDirectMessages(userId, user) {
  return chatApi.get(`/api/messages/${userId}`, {
    headers: buildChatUserHeaders(user)
  });
}

export function sendDirectMessage(userId, payload, user) {
  return chatApi.post(`/api/messages/send/${userId}`, payload, {
    headers: buildChatUserHeaders(user)
  });
}

export function getChatGroups(user) {
  return chatApi.get("/api/groups", {
    headers: buildChatUserHeaders(user)
  });
}

export function createChatGroup(payload, user) {
  return chatApi.post("/api/groups/create", payload, {
    headers: buildChatUserHeaders(user)
  });
}

export function getGroupMessages(groupId, user) {
  return chatApi.get(`/api/groups/${groupId}/messages`, {
    headers: buildChatUserHeaders(user)
  });
}

export function sendGroupMessage(groupId, payload, user) {
  return chatApi.post(`/api/groups/${groupId}/send`, payload, {
    headers: buildChatUserHeaders(user)
  });
}
