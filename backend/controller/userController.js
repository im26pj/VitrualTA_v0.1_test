const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { JWT_SECRET, JWT_EXPIRATION } = require('../config/jwtConfig');
const debug = require('debug')('app:userController');

//登入邏輯
exports.login = async (req, res) => {
  const { account, password } = req.body;

  try {
    const user = await User.findOne({ account });
    
    // 檢查帳號是否存在
    if (!user) {
      //console.log(`登入失敗：帳號 ${account} 不存在`);
      debug(`登入失敗：帳號 ${account} 不存在`);
      return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });    
    }

    // 檢查密碼是否正確
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      //console.log(`登入失敗：帳號 ${account} 密碼錯誤`);
      debug(`登入失敗：帳號 ${account} 密碼錯誤`);
      return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
    }

    // 簽發 JWT
    const token = jwt.sign(
      { id: user._id, account: user.account },
      JWT_SECRET,
      { 
        algorithm: 'HS256',  // 改用較普遍的 HS256
        expiresIn: JWT_EXPIRATION 
      }
    );

    //console.log(`使用者 ${account} 登入成功`);
    debug(`使用者 ${account} 登入成功`);
    return res.status(200).json({ success: true, token });
  } catch (err) {   
    //console.log('登入錯誤:', err.message);
    debug('登入錯誤:', err.message);
    return res.status(500).json({ success: false, message: '伺服器錯誤', error: err.message });
  }
};

exports.signup = async (req, res) => {
    const {fullname , account , password , checkpassword , email } = req.body;
  
    try {
      if (password !== checkpassword) {
        //console.log(`註冊失敗：使用者 ${account} 密碼不一致`);
        debug(`註冊失敗：使用者 ${account} 密碼不一致`);
        return res.status(401).json({ success: false, message: '密碼不一致' });
      }

      const existing = await User.findOne({ account });
      if (existing) {
        //console.log(`註冊失敗：帳號 ${account} 已存在`);
        debug(`註冊失敗：帳號 ${account} 已存在`);
        return res.status(409).json({ success: false, message: '帳號已存在' });
      }
  
      const newUser = new User({fullname , account, password , email}); // 密碼會自動加密！
      await newUser.save();
  
      res.status(201).json({ success: true, message: '註冊成功' });
    } catch (err) {
      //console.log('註冊錯誤:', err.message);
      debug('註冊錯誤:', err.message);
      res.status(400).json({ success: false, message: '註冊失敗', error: err.message });
    }
  };

  // controller/userController.js
exports.changePassword = async (req, res) => {
  try {
    // 從 Authorization header 中獲取 token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '請先登入' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { oldPassword, newPassword } = req.body;
    
    debug(`收到 change-password 請求`);
    debug(`account: ${decoded.account}`);
    debug(`oldPassword 長度: ${oldPassword?.length || 0}`);

    // 根據 token 中的 account 查找用戶
    const user = await User.findOne({ account: decoded.account });
    if (!user) {
      debug('找不到使用者');
      return res.status(404).json({ success: false, message: '找不到使用者' });
    }

    // 驗證舊密碼是否正確
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    debug(`bcrypt.compare 結果: ${isMatch}`);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: '舊密碼錯誤' });
    }

    // 更新密碼
    user.password = newPassword; // User model 中有 pre-save hook 會自動加密密碼
    await user.save();

    return res.json({ success: true, message: '密碼修改成功' });
  } catch (err) {
    debug('修改密碼錯誤:', err.message);
    return res.status(500).json({ success: false, message: '伺服器錯誤', error: err.message });
  }
};

