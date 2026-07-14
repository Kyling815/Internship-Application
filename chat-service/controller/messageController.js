import Message from "../models/Message.js";
import User from "../models/user.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

// Get all users except the current user
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      "username email profilePicture bio createdAt"
    );
    // count unread messages for each user
    const unSeenMessages = {};
    const promises = users.map(async (user) => {
      const message = await Message.find({ sender: user._id, receiver: req.user._id, seen: false });
      if (message.length > 0) {
        unSeenMessages[user._id] = message.length;
      }
    });
    await Promise.all(promises);
    res.status(200).json({ success: true, users: users, unSeenMessages });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Server error fetching users" });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  const userId = req.params.id;
  try {
    const { id: selectedUserId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: selectedUserId },
        { sender: selectedUserId, receiver: myId }
      ]
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { sender: selectedUserId, receiver: myId, seen: false },
      { $set: { seen: true } }
    );

    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ success: false, message: "Server error fetching user" });
  }
};

// api to mark messages as seen by id
export const markMessagesAsSeen = async (req, res) => {
  const senderId = req.params.id;
  try {
    await Message.findByIdAndUpdate(
      id,
      { seen: true });
    res.status(200).json({ success: true, message: "Messages marked as seen" });
  } catch (error) {
    console.error("Error marking messages as seen:", error);
    res.status(500).json({ success: false, message: "Server error marking messages as seen" });
  }
};

//  send message controller
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let imageUrl;
    if(image){
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: 'chat-app/messages',
      });
      imageUrl = uploadResponse.secure_url;
    }
    
    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      text,
      image: imageUrl,
    });

    // Emit the new message to the receiver if they are online
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: "Server error sending message" });
  }
};
// Delete message controller
export const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    // Check if the user is the sender of the message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only delete your own messages" });
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Emit delete event to receiver if online
    const receiverSocketId = userSocketMap[message.receiver];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", messageId);
    }

    res.status(200).json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ success: false, message: "Server error deleting message" });
  }
};

// Edit message controller
export const editMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || !text.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Message text is required" 
      });
    }

    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    // Check if the user is the sender of the message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only edit your own messages" 
      });
    }

    // Update message
    message.text = text;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    // Create response with sender as ID (not populated)
    const responseMessage = {
      _id: message._id,
      sender: message.sender,
      receiver: message.receiver,
      text: message.text,
      image: message.image,
      edited: message.edited,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt
    };

    // Emit edit event to receiver if online
    const receiverSocketId = userSocketMap[message.receiver.toString()];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", responseMessage);
    }

    res.status(200).json({ success: true, message: responseMessage });
  } catch (error) {
    console.error("Error editing message:", error);
    res.status(500).json({ success: false, message: "Server error editing message" });
  }
};
