import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/user.js';
import '../lib/env.js';

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.SECRET_KEY;
}

function getHeaderValue(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeUsername(value, fallback) {
  const base = String(value || fallback || "chat-user")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "chat-user";
}

function avatarFor(seed) {
  return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(seed || "User")}`;
}

async function resolveAuthenticatedUser(req, decoded) {
  const decodedUserId = decoded.id || decoded.sub;

  if (decodedUserId && mongoose.Types.ObjectId.isValid(decodedUserId)) {
    const chatUser = await User.findById(decodedUserId).select('-password');
    if (chatUser) return chatUser;
  }

  const appUserId = decoded.sub ? `fastapi:${decoded.sub}` : null;
  const email = decoded.email || getHeaderValue(req, 'x-user-email');
  const displayName = decoded.name || getHeaderValue(req, 'x-user-name') || email?.split('@')[0];
  const profilePicture = getHeaderValue(req, 'x-user-avatar') || avatarFor(displayName || email);

  if (!appUserId && !email) return null;

  const query = [];
  if (appUserId) query.push({ appUserId });
  if (email) query.push({ email });

  let user = query.length ? await User.findOne({ $or: query }) : null;
  if (!user) {
    const usernameBase = normalizeUsername(displayName, email?.split('@')[0]);
    const existingUsername = await User.exists({ username: usernameBase });

    user = await User.create({
      ...(appUserId ? { appUserId } : {}),
      username: existingUsername ? `${usernameBase}-${decoded.sub || Date.now()}`.slice(0, 64) : usernameBase,
      email: email || `${decoded.sub}@local.chat`,
      password: `external-auth-${decoded.sub || Date.now()}`,
      profilePicture,
      bio: "Synced from Internship Tracker",
    });
  } else {
    let changed = false;
    if (appUserId && !user.appUserId) {
      user.appUserId = appUserId;
      changed = true;
    }
    if (email && user.email !== email) {
      user.email = email;
      changed = true;
    }
    if (displayName && user.username?.startsWith("chat-user")) {
      user.username = normalizeUsername(displayName, email?.split('@')[0]);
      changed = true;
    }
    if (changed) await user.save();
  }

  return User.findById(user._id).select('-password');
}

export const ProtectedRoute = async (req, res, next) => {
  try {
    // Support both `Authorization: Bearer <token>` and `token` header
    const authHeader = req.headers.authorization || req.headers.token;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      console.error('JWT verify error:', err.message);
      return res.status(401).json({ success: false, message: 'Token is not valid' });
    }

    const user = await resolveAuthenticatedUser(req, decoded);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error in ProtectedRoute middleware:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

