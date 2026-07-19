import jwt from "jsonwebtoken";
import "../lib/env.js";
import { safeUser, usersRepo } from "../repositories/chatRepository.js";

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.SECRET_KEY;
}

function getHeaderValue(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function getDecodedHeaderValue(req, name) {
  const value = getHeaderValue(req, name);
  if (!value) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeDisplayName(value, fallback) {
  const base = String(value || fallback || "chat-user")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
  return base || "chat-user";
}

function isGeneratedChatName(value) {
  return /^chat-user(?:[-\w]*)?$/i.test(String(value || ""));
}

function isSluggedDisplayName(value, displayName) {
  const current = String(value || "");
  const next = String(displayName || "");
  return /-/.test(current) && /\p{L}/u.test(next) && current !== next;
}

function avatarFor(seed) {
  return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(seed || "User")}`;
}

async function resolveAuthenticatedUser(req, decoded) {
  const decodedUserId = decoded.id || decoded.sub;

  if (decodedUserId) {
    const chatUser = await usersRepo.getById(decodedUserId);
    if (chatUser) return safeUser(chatUser);
  }

  const appUserId = decoded.sub ? `fastapi:${decoded.sub}` : null;
  const email = decoded.email || getHeaderValue(req, "x-user-email");
  const displayName = decoded.name || getDecodedHeaderValue(req, "x-user-name") || email?.split("@")[0];
  const profilePicture = getHeaderValue(req, "x-user-avatar") || avatarFor(displayName || email);

  if (!appUserId && !email) return null;

  let user = await usersRepo.findByAppUserIdOrEmail(appUserId, email);
  if (!user) {
    const usernameBase = normalizeDisplayName(displayName, email?.split("@")[0]);
    const existingUsername = await usersRepo.existsByUsername(usernameBase);

    user = await usersRepo.create({
      ...(appUserId ? { appUserId } : {}),
      username: existingUsername ? `${usernameBase}-${decoded.sub || Date.now()}`.slice(0, 64) : usernameBase,
      displayName: usernameBase,
      email: email || `${decoded.sub}@local.chat`,
      password: `external-auth-${decoded.sub || Date.now()}`,
      profilePicture,
      bio: "Synced from Internship Tracker"
    });
  } else {
    const patch = {};
    if (appUserId && !user.appUserId) patch.appUserId = appUserId;
    if (email && user.email !== email) patch.email = email;
    const nextUsername = normalizeDisplayName(displayName, email?.split("@")[0]);
    if (displayName && (isGeneratedChatName(user.username) || isSluggedDisplayName(user.username, nextUsername))) {
      patch.username = nextUsername;
    }
    if (displayName && user.displayName !== nextUsername) patch.displayName = nextUsername;
    if (Object.keys(patch).length) user = await usersRepo.update(user._id, patch);
  }

  return safeUser(user);
}

export const ProtectedRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.token;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      console.error("JWT verify error:", err.message);
      return res.status(401).json({ success: false, message: "Token is not valid" });
    }

    const user = await resolveAuthenticatedUser(req, decoded);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in ProtectedRoute middleware:", error);
    res.status(401).json({ message: "Token is not valid" });
  }
};
