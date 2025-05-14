const express = require('express');
const router = express.Router();
const { upload, uploadImage } = require('../controllers/ImageController');

// 上傳單張圖片
router.post('/upload', upload.single('image'), uploadImage);

module.exports = router;
