const express = require('express');
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const router = express.Router();
const usercontroller = require('../controller/userController');
const chatController = require('../controller/chatController');
const groupController = require('../controller/groupController');
const uploadController = require('../controller/uploadController');
const ragController = require('../controller/ragController'); // 修改這行路徑


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


// 新增 PDF 相關路由
//router.post('/upload/pdf', chatController.uploadPdf);
//router.get('/pdfs', chatController.getPdfList);
//router.delete('/pdfs/:documentId', chatController.deletePdf);

// RAG 相關路由
// PDF 上傳 (支援公共和私人模式)
router.post('/upload/ragdata', ragController.uploadPdf);
// RAG 查詢 (支援公共和私人查詢)
router.post('/query', ragController.queryRag);
// 獲取文檔 (需要權限驗證)
router.get('/document/:id', ragController.getDocument);
// 獲取用戶的私人文檔列表
router.get('/user-documents', ragController.getUserDocuments);
// 獲取公共文檔列表
router.get('/public-documents', ragController.getPublicDocuments);
// 新增 PDF 文件相關路由
// 閱覽 PDF 文件（在瀏覽器中直接顯示）
router.get('/pdf/view/:fileId', ragController.viewPdf);
// 下載 PDF 文件
router.get('/pdf/download/:fileId', ragController.downloadPdf);
// 獲取 PDF 文件信息
router.get('/pdf/info/:fileId', ragController.getPdfInfo);

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

/*
// -------- 上傳相關 --------
router.post('/upload/file', upload.single("file"), uploadController.uploadFileToGroup);
router.get('/groups/:groupId/files/:fileId/download', uploadController.downloadFile);
router.delete('/groups/:groupId/files/:fileId', uploadController.deleteFile);
*/
module.exports = router;