const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 群主
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],               // 成員
  files: [
    {
      name: String,
      url: String,
    },
  ],
  messages: [
    {
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      content: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const Group = mongoose.model("Group", groupSchema);
module.exports = Group;
