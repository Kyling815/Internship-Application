import Group from "../models/Group.js";
import Message from "../models/Message.js";
import User from "../models/user.js";
import { io, userSocketMap } from "../server.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, avatar, memberIds } = req.body;
    const creator = req.user._id;

    if (!name || !memberIds || memberIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Group name and members are required" 
      });
    }

    // Ensure creator is in members list
    const uniqueMembers = [...new Set([creator.toString(), ...memberIds])];

    const newGroup = new Group({
      name,
      description: description || "",
      avatar: avatar || "",
      creator,
      members: uniqueMembers,
      admins: [creator], // Creator is default admin
    });

    await newGroup.save();

    // Populate member details
    await newGroup.populate('members', 'username email profilePicture');
    await newGroup.populate('creator', 'username email profilePicture');

    // Emit to all members
    uniqueMembers.forEach(memberId => {
      const socketId = userSocketMap[memberId.toString()];
      if (socketId) {
        io.to(socketId).emit("newGroup", newGroup);
      }
    });

    res.status(201).json({ 
      success: true, 
      group: newGroup,
      message: "Group created successfully" 
    });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error creating group" 
    });
  }
};

// Get all groups for current user
export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ members: userId })
      .populate('members', 'username email profilePicture')
      .populate('creator', 'username')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching groups" 
    });
  }
};

// Update group information (name, description, avatar)
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, avatar } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: "Group not found" 
      });
    }

    // Only admins can update group info
    if (!group.admins.includes(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can update group information" 
      });
    }

    // Update fields
    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (avatar !== undefined) group.avatar = avatar;

    // Save and get member IDs before populating
    const memberIds = group.members.map(m => m.toString());
    await group.save();
    
    // Populate for response
    await group.populate('members', 'username email profilePicture');
    await group.populate('creator', 'username email profilePicture');

    // Emit to all group members using saved IDs
    memberIds.forEach(memberId => {
      const socketId = userSocketMap[memberId];
      if (socketId) {
        io.to(socketId).emit("groupUpdated", group);
      }
    });

    res.status(200).json({ 
      success: true, 
      group,
      message: "Group updated successfully" 
    });
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error updating group" 
    });
  }
};

// Delete group (only creator can delete)
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: "Group not found" 
      });
    }

    // Only creator can delete the group
    if (group.creator.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Only the group creator can delete this group" 
      });
    }

    // Get member IDs before deleting
    const memberIds = group.members.map(m => m.toString());

    // Delete all messages in the group
    await Message.deleteMany({ group: groupId });

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    // Emit to all group members
    memberIds.forEach(memberId => {
      const socketId = userSocketMap[memberId];
      if (socketId) {
        io.to(socketId).emit("groupDeleted", { groupId });
      }
    });

    res.status(200).json({ 
      success: true, 
      message: "Group deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error deleting group" 
    });
  }
};

//   try {
//     const userId = req.user._id;

//     const groups = await Group.find({ members: userId })
//       .populate('members', 'username email profilePicture')
//       .populate('creator', 'username email profilePicture')
//       .populate({
//         path: 'lastMessage',
//         populate: { path: 'sender', select: 'username profilePicture' }
//       })
//       .sort({ updatedAt: -1 });

//     res.status(200).json({ success: true, groups });
//   } catch (error) {
//     console.error("Error fetching groups:", error);
//     res.status(500).json({ 
//       success: false, 
//       message: "Server error fetching groups" 
//     });
//   }
// };

// Get group by ID with messages
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Check if user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: "Group not found" 
      });
    }

    if (!group.members.includes(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: "You are not a member of this group" 
      });
    }

    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username profilePicture')
      .sort({ createdAt: 1 });

    // Mark messages as seen by current user
    await Message.updateMany(
      { 
        group: groupId, 
        sender: { $ne: userId },
        seenBy: { $ne: userId }
      },
      { $addToSet: { seenBy: userId } }
    );

    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching messages" 
    });
  }
};

// Send message to group
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, image } = req.body;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ 
        success: false, 
        message: "Message must have text or image" 
      });
    }

    // Check if user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: "Group not found" 
      });
    }

    if (!group.members.includes(senderId)) {
      return res.status(403).json({ 
        success: false, 
        message: "You are not a member of this group" 
      });
    }

    const newMessage = new Message({
      sender: senderId,
      group: groupId,
      text,
      image,
      seenBy: [senderId], // Sender has seen it
    });

    await newMessage.save();
    await newMessage.populate('sender', 'username profilePicture');

    // Update group's last message
    group.lastMessage = newMessage._id;
    await group.save();

    // Emit to all group members
    group.members.forEach(memberId => {
      const socketId = userSocketMap[memberId.toString()];
      if (socketId) {
        io.to(socketId).emit("newGroupMessage", {
          groupId,
          message: newMessage
        });
      }
    });

    res.status(201).json({ 
      success: true, 
      message: newMessage 
    });
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error sending message" 
    });
  }
};

// Add members to group
export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: newMemberId } = req.body;
    const currentUserId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: "Group not found" 
      });
    }

    // Check if current user is admin
    if (!group.admins.includes(currentUserId)) {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can add members" 
      });
    }

    // Check if user already a member
    if (group.members.includes(newMemberId)) {
      return res.status(400).json({ 
        success: false, 
        message: "User is already a member" 
      });
    }

    group.members.push(newMemberId);
    await group.save();
    await group.populate('members', 'username email profilePicture');

    // Get new member info for notification
    const newMember = await User.findById(newMemberId).select('username email profilePicture');

    // Notify new member
    const socketId = userSocketMap[newMemberId.toString()];
    if (socketId) {
      io.to(socketId).emit("addedToGroup", group);
    }

    // Notify all existing members
    group.members.forEach((member) => {
      const memberId = typeof member === 'string' ? member : member._id;
      if (memberId.toString() !== newMemberId.toString()) {
        const memberSocketId = userSocketMap[memberId.toString()];
        if (memberSocketId) {
          io.to(memberSocketId).emit("memberAdded", {
            groupId,
            newMember: newMember
          });
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      group,
      message: "Member added successfully" 
    });
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error adding member" 
    });
  }
};

// Remove member from group
export const removeMember = async (req, res) => {
  try {
    const { groupId, userId: memberToRemove } = req.params;
    const currentUserId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: "Group not found" 
      });
    }

    // Check if current user is admin or removing themselves
    const isAdmin = group.admins.includes(currentUserId);
    const isSelf = currentUserId.toString() === memberToRemove;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ 
        success: false, 
        message: "Only admins can remove members" 
      });
    }

    // Cannot remove creator
    if (memberToRemove === group.creator.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot remove group creator" 
      });
    }

    group.members = group.members.filter(id => id.toString() !== memberToRemove);
    group.admins = group.admins.filter(id => id.toString() !== memberToRemove);
    await group.save();

    // Notify removed member
    const socketId = userSocketMap[memberToRemove.toString()];
    if (socketId) {
      io.to(socketId).emit("removedFromGroup", { groupId });
    }

    // Notify remaining members
    group.members.forEach(memberId => {
      const memberSocketId = userSocketMap[memberId.toString()];
      if (memberSocketId) {
        io.to(memberSocketId).emit("memberRemoved", {
          groupId,
          removedMemberId: memberToRemove
        });
      }
    });

    res.status(200).json({ 
      success: true, 
      message: isSelf ? "Left group successfully" : "Member removed successfully" 
    });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error removing member" 
    });
  }
};

// Delete group message
export const deleteGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message || !message.group) {
      return res.status(404).json({ 
        success: false, 
        message: "Message not found" 
      });
    }

    // Only sender or group admin can delete
    const group = await Group.findById(message.group);
    const isAdmin = group.admins.includes(userId);
    const isSender = message.sender.toString() === userId.toString();

    if (!isAdmin && !isSender) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only delete your own messages or be an admin" 
      });
    }

    await Message.findByIdAndDelete(messageId);

    // Emit to all group members
    group.members.forEach(memberId => {
      const socketId = userSocketMap[memberId.toString()];
      if (socketId) {
        io.to(socketId).emit("groupMessageDeleted", {
          groupId: group._id,
          messageId
        });
      }
    });

    res.status(200).json({ 
      success: true, 
      message: "Message deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting group message:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error deleting message" 
    });
  }
};

// Edit group message
export const editGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || !text.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Message text is required" 
      });
    }

    const message = await Message.findById(messageId);
    if (!message || !message.group) {
      return res.status(404).json({ 
        success: false, 
        message: "Message not found" 
      });
    }

    // Only sender can edit their own message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only edit your own messages" 
      });
    }

    // Update message text and add edited flag
    message.text = text;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();
    await message.populate('sender', 'username profilePicture');

    // Get group for socket emission
    const group = await Group.findById(message.group);

    // Emit to all group members
    group.members.forEach(memberId => {
      const socketId = userSocketMap[memberId.toString()];
      if (socketId) {
        io.to(socketId).emit("groupMessageEdited", {
          groupId: group._id,
          message
        });
      }
    });

    res.status(200).json({ 
      success: true, 
      message 
    });
  } catch (error) {
    console.error("Error editing group message:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error editing message" 
    });
  }
};
