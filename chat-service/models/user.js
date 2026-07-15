import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  appUserId: { type: String, unique: true, sparse: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  createdAt: { type: Date, default: Date.now },
  profilePicture: { type: String, required: true },
  bio: { type: String, default: "" },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
