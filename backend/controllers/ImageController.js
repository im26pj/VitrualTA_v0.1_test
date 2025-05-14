const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');  // 確保 uploads 資料夾存在
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 處理圖片上傳
const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  // 回傳儲存路徑 (可做為 Ollama 的輸入路徑)
  res.status(200).json({
    message: 'Image uploaded successfully',
    imagePath: req.file.path
  });
};

module.exports = { upload, uploadImage };
