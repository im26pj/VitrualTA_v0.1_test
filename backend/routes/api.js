const express = require('express');
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const router = express.Router();
const usercontroller = require('../controller/userController');
const chatController = require('../controller/chatController');
const groupController = require('../controller/groupController');
const uploadController = require('../controller/uploadController');

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

// 新增 LoRA 和模型檔案上傳路由
router.post('/upload/lora', chatController.uploadLora);
router.post('/upload/model', chatController.uploadModel);
router.get('/loras', chatController.getLoraList);
router.get('/models', chatController.getModelList);

// -------- 群組相關 --------
router.get('/groups', groupController.getAllGroups);
router.post('/groups', groupController.createGroup);
router.get('/groups/:id', groupController.getGroupById);
// 修改加入群組路由，使用群組代碼作為參數
router.post('/groups/join/:code', groupController.joinGroup);
router.post('/groups/:id/removeMember', groupController.removeMember);
router.post('/groups/:id/leave', groupController.leaveGroup);
router.post('/groups/:groupId/messages', groupController.sendMessage);
router.get('/groups/:id/messages', groupController.getGroupMessages);


// -------- 上傳相關 --------
router.post('/upload/file', upload.single("file"), uploadController.uploadFileToGroup);

module.exports = router;