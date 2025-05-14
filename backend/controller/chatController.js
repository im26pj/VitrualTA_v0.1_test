const axios = require('axios');

exports.chatWithOllama = async (req, res) => {
  const { conversationHistory } = req.body;

  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    return res.status(400).json({ success: false, message: '缺少 conversationHistory' });
  }

  try {
    // 設置 SSE 回應 Header
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 發送請求到外部聊天模型
    const response = await axios.post(
      'http://localhost:11434/api/chat',
      {
        model: 'llama3',
        stream: true,
        messages: conversationHistory
      },
      {
        responseType: 'stream'
      }
    );

    // 監聽外部模型的回應，並逐步發送給前端
    response.data.on('data', (chunk) => {
      try {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const json = JSON.parse(line);
          if (json.message?.content) {
            // 使用對應的 res 物件將數據發送給前端
            res.write(`data: ${JSON.stringify({ content: json.message.content })}\n\n`);
          }
        }
      } catch (err) {
        console.error('JSON parse error:', err.message);
      }
    });

    response.data.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    response.data.on('error', (err) => {
      console.error('Stream error:', err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('Ollama API 錯誤:', error.message);
    res.write(`data: ${JSON.stringify({ error: '無法連線至 Ollama' })}\n\n`);
    res.end();
  }
};
