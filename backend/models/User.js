const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  fullname:{ type: String , required: true },
  account: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
}, {
  collection: 'user'
});

// 當儲存 User 前，自動加密密碼
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); // 沒改密碼就跳過
  try {
    const salt = await bcrypt.genSalt(10);         // 產生 salt
    this.password = await bcrypt.hash(this.password, salt); // 加密
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('User', userSchema);
