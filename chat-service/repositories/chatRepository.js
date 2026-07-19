import crypto from "node:crypto";
import { CHAT_TABLES, deleteItem, getItem, putItem, scanAll } from "../lib/dynamo.js";

function now() {
  return new Date().toISOString();
}

function id() {
  return crypto.randomUUID();
}

function cloneWithoutPassword(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function normalizeList(value) {
  return Array.isArray(value) ? value.map(String) : [];
}

function byCreatedAtAsc(a, b) {
  return new Date(a.createdAt || a.timestamp || 0) - new Date(b.createdAt || b.timestamp || 0);
}

function byUpdatedAtDesc(a, b) {
  return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
}

export const usersRepo = {
  async create(data) {
    const timestamp = now();
    const user = {
      _id: data._id || id(),
      appUserId: data.appUserId,
      username: data.username,
      displayName: data.displayName || data.username,
      email: data.email,
      password: data.password,
      profilePicture: data.profilePicture,
      bio: data.bio || "",
      createdAt: data.createdAt || timestamp,
      updatedAt: timestamp
    };
    return putItem(CHAT_TABLES.users, user);
  },

  async getById(userId) {
    return getItem(CHAT_TABLES.users, String(userId));
  },

  async getSafeById(userId) {
    return cloneWithoutPassword(await this.getById(userId));
  },

  async list() {
    return scanAll(CHAT_TABLES.users);
  },

  async listExcept(userId) {
    const users = await this.list();
    return users.filter((user) => user._id !== String(userId)).map(cloneWithoutPassword);
  },

  async findByEmail(email) {
    if (!email) return null;
    const users = await this.list();
    return users.find((user) => user.email === email) || null;
  },

  async findByAppUserId(appUserId) {
    if (!appUserId) return null;
    const users = await this.list();
    return users.find((user) => user.appUserId === appUserId) || null;
  },

  async findByEmailOrUsername(email, username) {
    const users = await this.list();
    return users.find((user) => user.email === email || user.username === username) || null;
  },

  async findByAppUserIdOrEmail(appUserId, email) {
    const users = await this.list();
    return users.find((user) => (appUserId && user.appUserId === appUserId) || (email && user.email === email)) || null;
  },

  async existsByUsername(username) {
    const users = await this.list();
    return users.some((user) => user.username === username);
  },

  async update(userId, patch) {
    const current = await this.getById(userId);
    if (!current) return null;
    const updated = { ...current, ...patch, _id: current._id, updatedAt: now() };
    return putItem(CHAT_TABLES.users, updated);
  },

  async delete(userId) {
    await deleteItem(CHAT_TABLES.users, String(userId));
  }
};

export const messagesRepo = {
  async create(data) {
    if ((data.receiver && data.group) || (!data.receiver && !data.group)) {
      throw new Error("Message must have either receiver or group, not both or neither");
    }
    const timestamp = now();
    const message = {
      _id: data._id || id(),
      sender: String(data.sender),
      receiver: data.receiver ? String(data.receiver) : undefined,
      group: data.group ? String(data.group) : undefined,
      text: data.text || "",
      image: data.image,
      seen: data.seen ?? false,
      seenBy: normalizeList(data.seenBy),
      edited: data.edited ?? false,
      editedAt: data.editedAt,
      timestamp: data.timestamp || timestamp,
      createdAt: data.createdAt || timestamp,
      updatedAt: timestamp
    };
    return putItem(CHAT_TABLES.messages, message);
  },

  async getById(messageId) {
    return getItem(CHAT_TABLES.messages, String(messageId));
  },

  async list() {
    return scanAll(CHAT_TABLES.messages);
  },

  async listDirectBetween(userA, userB) {
    const first = String(userA);
    const second = String(userB);
    const messages = await this.list();
    return messages
      .filter((message) =>
        (message.sender === first && message.receiver === second) ||
        (message.sender === second && message.receiver === first)
      )
      .sort(byCreatedAtAsc);
  },

  async listGroup(groupId) {
    const messages = await this.list();
    return messages.filter((message) => message.group === String(groupId)).sort(byCreatedAtAsc);
  },

  async countUnreadFromSender(senderId, receiverId) {
    const messages = await this.list();
    return messages.filter((message) => message.sender === String(senderId) && message.receiver === String(receiverId) && !message.seen).length;
  },

  async markDirectSeen(senderId, receiverId) {
    const messages = await this.list();
    const targets = messages.filter((message) => message.sender === String(senderId) && message.receiver === String(receiverId) && !message.seen);
    await Promise.all(targets.map((message) => putItem(CHAT_TABLES.messages, { ...message, seen: true, updatedAt: now() })));
  },

  async markGroupSeen(groupId, userId) {
    const messages = await this.listGroup(groupId);
    const targets = messages.filter((message) => message.sender !== String(userId) && !normalizeList(message.seenBy).includes(String(userId)));
    await Promise.all(targets.map((message) => putItem(CHAT_TABLES.messages, {
      ...message,
      seenBy: [...normalizeList(message.seenBy), String(userId)],
      updatedAt: now()
    })));
  },

  async update(messageId, patch) {
    const current = await this.getById(messageId);
    if (!current) return null;
    const updated = { ...current, ...patch, _id: current._id, updatedAt: now() };
    return putItem(CHAT_TABLES.messages, updated);
  },

  async delete(messageId) {
    await deleteItem(CHAT_TABLES.messages, String(messageId));
  },

  async deleteByGroup(groupId) {
    const messages = await this.listGroup(groupId);
    await Promise.all(messages.map((message) => this.delete(message._id)));
  }
};

export const groupsRepo = {
  async create(data) {
    const timestamp = now();
    const group = {
      _id: data._id || id(),
      name: data.name,
      description: data.description || "",
      avatar: data.avatar || "",
      creator: String(data.creator),
      members: normalizeList(data.members),
      admins: normalizeList(data.admins),
      lastMessage: data.lastMessage,
      createdAt: data.createdAt || timestamp,
      updatedAt: timestamp
    };
    return putItem(CHAT_TABLES.groups, group);
  },

  async getById(groupId) {
    return getItem(CHAT_TABLES.groups, String(groupId));
  },

  async list() {
    return scanAll(CHAT_TABLES.groups);
  },

  async listForMember(userId) {
    const groups = await this.list();
    return groups.filter((group) => normalizeList(group.members).includes(String(userId))).sort(byUpdatedAtDesc);
  },

  async update(groupId, patch) {
    const current = await this.getById(groupId);
    if (!current) return null;
    const updated = { ...current, ...patch, _id: current._id, updatedAt: now() };
    return putItem(CHAT_TABLES.groups, updated);
  },

  async delete(groupId) {
    await deleteItem(CHAT_TABLES.groups, String(groupId));
  }
};

export async function populateUser(userId) {
  return usersRepo.getSafeById(userId);
}

export async function populateMembers(memberIds) {
  const users = await Promise.all(normalizeList(memberIds).map((memberId) => usersRepo.getSafeById(memberId)));
  return users.filter(Boolean);
}

export async function populateGroup(group) {
  if (!group) return null;
  const [members, creator, lastMessage] = await Promise.all([
    populateMembers(group.members),
    usersRepo.getSafeById(group.creator),
    group.lastMessage ? messagesRepo.getById(group.lastMessage) : Promise.resolve(null)
  ]);
  return { ...group, members, creator, lastMessage };
}

export async function populateMessageSender(message) {
  if (!message) return null;
  const sender = await usersRepo.getSafeById(message.sender);
  return { ...message, sender: sender || message.sender };
}

export function safeUser(user) {
  return cloneWithoutPassword(user);
}
