const axios = require('axios');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Chat = require('../models/Chat');
const { JWT_SECRET } = require('../config/jwtConfig');

exports.chatWithOllama = async (req, res) => {
  const { conversationHistory, isVisitor, chat_id, isNewChat } = req.body;
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

      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        userId = decoded.id;
      } catch (tokenError) {
        console.error('Token 驗證失敗:', tokenError);
        return res.status(401).json({ success: false, message: '登入驗證失敗' });
      }
    }

    // 設置 SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let assistantMessage = { role: 'assistant', content: '' };

    const response = await axios.post(
      'http://localhost:11434/api/chat',
      {
        model: 'llama3.2-vision:11b',
        stream: true,
        messages: conversationHistory
      },
      { responseType: 'stream' }
    );

    response.data.on('data', (chunk) => {
      try {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const json = JSON.parse(line);
          if (json.message?.content) {
            assistantMessage.content += json.message.content;
            res.write(`data: ${JSON.stringify({ content: json.message.content })}\n\n`);
          }
        }
      } catch (err) {
        console.error('解析回應失敗:', err);
      }
    });

    response.data.on('end', async () => {
      try {
        if (!isVisitor) {
          const userMessage = conversationHistory[conversationHistory.length - 1];
          
          // 使用 findOneAndUpdate 來更新或創建對話
          await Chat.findOneAndUpdate(
            { chat_id },
            {
              $setOnInsert: { 
                userId, 
                chat_id,
                title: userMessage.content.substring(0, 50) + '...' // 使用第一條消息作為標題
              },
              $push: {
                chat_history: [
                  { ...userMessage, timestamp: new Date() },
                  { ...assistantMessage, timestamp: new Date() }
                ]
              },
              $set: { updated_at: new Date() }
            },
            { 
              upsert: true, // 如果不存在則創建
              new: true 
            }
          );
        }
        
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (dbErr) {
        console.error('儲存對話失敗:', dbErr);
        res.write(`data: ${JSON.stringify({ error: '儲存對話失敗' })}\n\n`);
        res.end();
      }
    });

    response.data.on('error', (err) => {
      console.error('串流錯誤:', err);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('聊天錯誤:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
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
