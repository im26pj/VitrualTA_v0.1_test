const express = require('express');
const router = express.Router();
const usercontroller = require('../controller/userController');
const chatController = require('../controller/chatController');

router.post('/login', usercontroller.login); // 登入
router.post('/signup', usercontroller.signup); // 註冊
router.post('/chat', chatController.chatWithOllama); // 聊天

module.exports = router;