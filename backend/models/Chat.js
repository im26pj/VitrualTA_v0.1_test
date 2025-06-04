const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant']
  },
  content: {
    type: String
  },
  graph_json: {
    type: mongoose.Schema.Types.Mixed,  // 使用 Mixed 類型以支持存儲任何類型的數據
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  img_id: [{
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
