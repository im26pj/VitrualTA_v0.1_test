const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chat_id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  chat_history: [{
    role: String,
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  collection: 'chat'
});

module.exports = mongoose.model('Chat', chatSchema);
