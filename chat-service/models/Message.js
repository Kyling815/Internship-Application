import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For direct messages
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // For group messages
  text: { type: String },
  image: { type: String },
  seen: { type: Boolean, default: false }, // Only for direct messages
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // For group messages
  edited: { type: Boolean, default: false }, // Track if message was edited
  editedAt: { type: Date }, // When message was last edited
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

// Either receiver OR group must be present, not both
messageSchema.pre('save', function() {
  if ((this.receiver && this.group) || (!this.receiver && !this.group)) {
    throw new Error('Message must have either receiver or group, not both or neither');
  }
});

const Message = mongoose.model("Message", messageSchema);

export default Message;