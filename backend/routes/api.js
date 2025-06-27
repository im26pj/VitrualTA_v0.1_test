const express = require('express');
const router = express.Router();
const usercontroller = require('../controller/userController');
const chatController = require('../controller/chatController');

router.post('/login', usercontroller.login); // 登入
router.post('/signup', usercontroller.signup); // 註冊
router.post('/chat', chatController.chatWithOllama); // 舊的聊天路由
router.post('/chat/stream', chatController.chatWithOllama); // 新的串流聊天路由
router.post('/cpassword', usercontroller.changePassword);// 修改密碼
router.get('/chat/histories', chatController.getChatHistories);
router.get('/chat/:chatId', chatController.getChatById);
router.post('/upload/image', chatController.uploadImage);
router.delete('/images/:fileId', chatController.deleteImage);
router.get('/images/:fileId', chatController.getImage); // 添加圖片路由
router.delete('/chat/:chatId', chatController.deleteChat); // 添加刪除對話路由

module.exports = router;