const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  img_id: [{  // 只保留 img_id 陣列
    type: String
  }]
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  chat_id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  chat_history: [chatHistorySchema],
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Chat', chatSchema);
