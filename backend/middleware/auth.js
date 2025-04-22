const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../controller/userController');

const verifyToken = async (req, res, next) => {
  try {
    // 從 header 取得 token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: '請先登入' });
    }

    const token = authHeader.split(' ')[1];

    // 驗證 token
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS512'] // 指定演算法
    });

    // 檢查是否過期
    if (decoded.exp <= Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ message: '登入已過期' });
    }

    // 將解碼後的資料加入 request
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token 驗證失敗:', err.message);
    return res.status(401).json({ message: '無效的登入狀態' });
  }
};

module.exports = verifyToken;
