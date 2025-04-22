const axios = require('axios');

exports.chatWithOllama = async (req, res) => {
  const { conversationHistory } = req.body;

  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    return res.status(400).json({ success: false, message: '缺少 conversationHistory' });
  }

  try {
    // 設置 response header 支援流式輸出
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

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

    // 直接將 Ollama 的響應轉發給客戶端
    response.data.on('data', (chunk) => {
      try {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const json = JSON.parse(line);
          if (json.message?.content) {
            // 發送 SSE 格式的數據
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
