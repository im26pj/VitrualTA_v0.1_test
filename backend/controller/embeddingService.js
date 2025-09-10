const axios = require('axios');

/**
 * 使用 Ollama 生成文本嵌入向量
 * @param {string} text - 需要嵌入的文本
 * @param {string} model - 嵌入模型名稱
 * @returns {Promise<Array>} - 嵌入向量
 */
async function createEmbedding(text, model) {
  try {
    const response = await axios.post('http://localhost:11434/api/embeddings', {
      model: model,
      prompt: text
    });
    
    return response.data.embedding;
  } catch (error) {
    console.error('嵌入向量生成失敗:', error);
    throw error;
  }
}

/**
 * 使用 Ollama 生成文本回應，無超時限制
 * @param {string} prompt - 提示詞
 * @param {string} model - 語言模型名稱
 * @returns {Promise<string>} - 生成的回應
 */
async function generateResponse(prompt, model) {
  try {
    console.log(`正在使用模型 ${model} 處理查詢...`);
    console.log(`處理開始時間: ${new Date().toISOString()}`);
    
    // 使用無超時設置的請求
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: model,
      prompt: prompt,
      stream: false  // 不使用流式傳輸以避免複雜性
    }, { 
      timeout: 0  // 0 表示無超時
    });
    
    console.log(`處理完成時間: ${new Date().toISOString()}`);
    
    if (!response.data || !response.data.response) {
      console.error('Ollama 回應格式異常:', JSON.stringify(response.data));
      return '無法生成回應，請檢查 Ollama 服務狀態。';
    }
    
    console.log(`成功生成回應，長度: ${response.data.response.length} 字元`);
    return response.data.response;
  } catch (error) {
    console.error('生成回應時發生錯誤:', error.message);
    if (error.response) {
      console.error('錯誤回應內容:', error.response.data);
    }
    
    return `處理您的查詢時遇到了問題: ${error.message}`;
  }
}

/**
 * 使用 Ollama 生成文本回應（串流模式）
 * @param {string} prompt - 提示詞
 * @param {string} model - 語言模型名稱
 * @param {number} timeout - 超時設定（毫秒）
 * @returns {Promise<string>} - 生成的回應
 */
async function generateResponseStream(prompt, model, timeout = 180000) {
  return new Promise((resolve, reject) => {
    let fullResponse = '';
    let timer = null;
    
    // 設置全局超時
    const timeoutId = setTimeout(() => {
      if (timer) clearTimeout(timer);
      reject(new Error(`Request timed out after ${timeout}ms`));
    }, timeout);
    
    axios({
      method: 'post',
      url: 'http://localhost:11434/api/generate',
      data: {
        model: model,
        prompt: prompt,
        stream: true
      },
      responseType: 'stream'
    }).then(response => {
      response.data.on('data', chunk => {
        try {
          const lines = chunk.toString().split('\n').filter(Boolean);
          
          for (const line of lines) {
            const data = JSON.parse(line);
            
            if (data.response) {
              fullResponse += data.response;
              
              // 重置活動計時器
              if (timer) clearTimeout(timer);
              timer = setTimeout(() => {
                console.log('串流回應無活動，結束處理');
                clearTimeout(timeoutId);
                resolve(fullResponse);
              }, 5000); // 5 秒無活動視為完成
            }
            
            if (data.done) {
              if (timer) clearTimeout(timer);
              clearTimeout(timeoutId);
              resolve(fullResponse);
              return;
            }
          }
        } catch (e) {
          console.error('解析串流回應時發生錯誤:', e);
        }
      });
      
      response.data.on('end', () => {
        if (timer) clearTimeout(timer);
        clearTimeout(timeoutId);
        resolve(fullResponse);
      });
      
      response.data.on('error', err => {
        if (timer) clearTimeout(timer);
        clearTimeout(timeoutId);
        reject(err);
      });
    }).catch(err => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}

module.exports = {
  createEmbedding,
  generateResponse,
  generateResponseStream
};