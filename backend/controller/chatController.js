//const axios = require('axios');
const { default: ollama } = require('ollama');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Chat = require('../models/Chat');
const { JWT_SECRET } = require('../config/jwtConfig');
const multer = require('multer');
const { GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 配置 multer 存儲
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 限制 30MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片檔案'));
    }
  }
}).array('images', 5); // 允許最多上傳5張圖片

exports.chatWithOllama = async (req, res) => {
  const { conversationHistory, isVisitor, chat_id, isNewChat, img_64, img_id } = req.body;
  const authHeader = req.headers.authorization;

  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    return res.status(400).json({ success: false, message: '缺少對話歷史' });
  }

  try {
    let userId;
    if (!isVisitor) {
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: '請先登入' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    }

    // SSE 設置
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 修改 processedHistory 的處理方式
    const processedHistory = await Promise.all(
      conversationHistory.map(async (msg) => {
        if (msg.img_id && msg.img_id.length > 0) {
          try {
            const images = await Promise.all(msg.img_id.map(async (id) => {
              const bucket = new GridFSBucket(mongoose.connection.db, {
                bucketName: 'images'
              });
              
              const file = await mongoose.connection.db
                .collection('images.files')
                .findOne({ _id: new ObjectId(id) });

              if (!file) {
                throw new Error('找不到圖片');
              }

              const chunks = [];
              const downloadStream = bucket.openDownloadStream(new ObjectId(id));
              
              for await (const chunk of downloadStream) {
                chunks.push(chunk);
              }
              
              const buffer = Buffer.concat(chunks);
              return buffer.toString('base64');
            }));

            return {
              role: msg.role,
              content: msg.content,
              images // 只用於 Ollama 請求，不儲存到資料庫
            };
          } catch (error) {
            console.error('圖片處理錯誤:', error);
            return msg;
          }
        }
        return msg;
      })
    );

    // 準備用戶訊息
    const userMessage = {
      ...conversationHistory[conversationHistory.length - 1],
      timestamp: new Date()
    };

    // 如果有新的圖片，加入到用戶訊息中
    if (img_64) {
      userMessage.images = Array.isArray(img_64) ? img_64 : [img_64];
    }
    if (img_id) {
      userMessage.img_id = img_id; // 儲存圖片ID以供後續使用
    }

    // 修改 Ollama 請求的構建
    const ollamaRequest = {
      model: 'llama3.2-vision:11b',
      messages: [
        ...processedHistory.slice(0, -1),
        {
          ...processedHistory[processedHistory.length - 1],
          images: processedHistory[processedHistory.length - 1]?.images
        }
      ],
      stream: true
    };

    console.log('Ollama Request:', JSON.stringify(ollamaRequest, null, 2));

    // 準備 assistant 訊息
    let assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    // 收集完整回應
    let fullResponse = '';
    const iterator = await ollama.chat(ollamaRequest);
    
    for await (const chunk of iterator) {
      const chunkContent = chunk.message?.content ?? '';
      fullResponse += chunkContent;
      assistantMessage.content += chunkContent;
      res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
    }

    // 儲存對話到資料庫
    if (!isVisitor) {
      try {
        let chatDoc;
        if (isNewChat) {
          const cleanUserMessage = {
            role: userMessage.role,
            content: userMessage.content,
            timestamp: userMessage.timestamp,
            img_id: Array.isArray(userMessage.img_id) ? userMessage.img_id : []  // 只保留 img_id
          };
          
          chatDoc = new Chat({
            userId,
            chat_id,
            title: userMessage.content.substring(0, 50) + '...',
            chat_history: [cleanUserMessage],
            updated_at: new Date()
          });
        } else {
          // 更新現有對話
          chatDoc = await Chat.findOne({ chat_id, userId });
          if (!chatDoc) {
            chatDoc = new Chat({
              userId,
              chat_id,
              title: userMessage.content.substring(0, 50) + '...',
              chat_history: [],
              updated_at: new Date()
            });
          }

          // 添加新的對話記錄
          const cleanUserMessage = {
            role: userMessage.role,
            content: userMessage.content,
            timestamp: userMessage.timestamp,
            img_id: Array.isArray(userMessage.img_id) ? userMessage.img_id : []  // 只保留 img_id
          };
          
          chatDoc.chat_history.push(cleanUserMessage);
        }
        
        // 添加 assistant 的回應
        chatDoc.chat_history.push({
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
          img_id: []  // assistant 回應沒有圖片
        });
        
        chatDoc.updated_at = new Date();
        await chatDoc.save();
        
        console.log('對話已儲存:', chatDoc);
      } catch (dbErr) {
        console.error('儲存對話失敗:', dbErr);
        res.write(`data: ${JSON.stringify({ error: '儲存對話失敗' })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('聊天錯誤:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
};

exports.getChatHistories = async (req, res) => {
  console.log('getChatHistories called');
  console.log('Headers:', req.headers);  // 檢查所有 headers
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('No authorization header found');
    return res.status(401).json({ success: false, message: '未提供認證' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Extracted token:', token);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded);

    const histories = await Chat.find(
      { userId: decoded.id },
      { chat_id: 1, title: 1, updated_at: 1 }
    ).sort({ updated_at: -1 });
    
    console.log('Found histories:', histories);
    res.json({ success: true, histories });
    
  } catch (err) {
    console.error('Error in getChatHistories:', err);
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: '無效的認證token' });
    }
    res.status(500).json({ success: false, message: '載入對話歷史失敗' });
  }
};

exports.getChatById = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const chat = await Chat.findOne({
      userId: decoded.id,
      chat_id: req.params.chatId
    });
    
    if (!chat) {
      return res.status(404).json({ success: false, message: '對話不存在' });
    }
    
    res.json({ success: true, chat_history: chat.chat_history });
  } catch (err) {
    res.status(500).json({ success: false, message: '載入對話失敗' });
  }
};

// 修改上傳圖片處理函數
exports.uploadImage = async (req, res) => {
  try {
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '請先登入' });
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    upload(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ success: false, message: err.message });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: '未提供圖片檔案' });
      }

      try {
        const bucket = new GridFSBucket(mongoose.connection.db, {
          bucketName: 'images'
        });

        // 處理所有上傳的圖片
        const uploadedImages = await Promise.all(req.files.map(async (file) => {
          return new Promise((resolve, reject) => {
            const uploadStream = bucket.openUploadStream(file.originalname, {
              metadata: {
                userId: decoded.id,
                contentType: file.mimetype,
                uploadDate: new Date(),
                chat_id: req.body.chat_id
              }
            });

            // 將圖片轉換為 Base64
            const base64Image = file.buffer.toString('base64');

            uploadStream.on('finish', () => {
              resolve({
                success: true,
                _id: uploadStream.id.toString(),
                fileId: uploadStream.id.toString(),
                filename: file.originalname,
                contentType: file.mimetype,
                uploadDate: new Date(),
                base64: `${base64Image}`
              });
            });

            uploadStream.on('error', reject);
            uploadStream.end(file.buffer);
          });
        }));

        res.json({
          success: true,
          images: uploadedImages
        });

      } catch (gridfsErr) {
        console.error('GridFS error:', gridfsErr);
        res.status(500).json({ success: false, message: '圖片儲存失敗' });
      }
    });
  } catch (err) {
    console.error('General error:', err);
    res.status(500).json({ success: false, message: '圖片上傳失敗' });
  }
};

// 根據 ID 獲取圖片
exports.getImage = async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.fileId);
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'images'
    });

    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('file', (file) => {
      res.set('Content-Type', file.metadata.contentType);
    });

    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: '獲取圖片失敗' });
  }
};



// 根據檔案 ID 取得圖片位置
exports.getImage_locate = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'images'
    });

    // 先取得檔案資訊
    const file = await mongoose.connection.db
      .collection('images.files')
      .findOne({ _id: new ObjectId(fileId) });

    if (!file) {
      return res.status(404).json({ 
        success: false, 
        message: '找不到圖片'
      });
    }

    const tempDir = path.join(__dirname, '../temp_img');
    const localPath = path.join(tempDir, file.filename);

    // 檢查圖片是否已經存在於 temp_img 資料夾
    if (fs.existsSync(localPath)) {
      console.log('圖片已存在於本地:', localPath);
      return res.json({
        success: true,
        path: localPath,
        filename: file.filename
      });
    }

    // 圖片不存在，需要從 GridFS 下載
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    const writeStream = fs.createWriteStream(localPath);

    downloadStream.pipe(writeStream)
      .on('error', (error) => {
        console.error('下載錯誤:', error);
        res.status(500).json({ 
          success: false, 
          message: '圖片下載失敗' 
        });
      })
      .on('finish', () => {
        console.log('圖片已下載至:', localPath);
        res.json({
          success: true,
          path: localPath,
          filename: file.filename
        });
      });

  } catch (err) {
    console.error('取得圖片位置錯誤:', err);
    res.status(500).json({ 
      success: false, 
      message: '取得圖片位置失敗' 
    });
  }
};

// 刪除圖片
exports.deleteImage = async (req, res) => {
  try {
    // 驗證用戶是否已登入
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '請先登入' });
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const fileId = req.params.fileId;

    // 建立 GridFS bucket
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'images'
    });

    // 檢查圖片是否存在且屬於該用戶
    const file = await mongoose.connection.db
      .collection('images.files')
      .findOne({ 
        _id: new ObjectId(fileId),
        'metadata.userId': decoded.id 
      });

    if (!file) {
      return res.status(404).json({ 
        success: false, 
        message: '找不到圖片或無權限刪除此圖片' 
      });
    }

    // 刪除圖片
    await bucket.delete(new ObjectId(fileId));

    // 如果圖片存在於暫存目錄，也一併刪除
    const tempDir = path.join(__dirname, '../temp_img');
    const localPath = path.join(tempDir, file.filename);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }

    res.json({
      success: true,
      message: '圖片已成功刪除'
    });

  } catch (err) {
    console.error('刪除圖片錯誤:', err);
    res.status(500).json({ 
      success: false, 
      message: '刪除圖片失敗' 
    });
  }
};

// 將 upload 中間件導出
exports.upload = upload;
