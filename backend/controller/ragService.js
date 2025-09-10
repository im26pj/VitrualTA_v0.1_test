const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const { GridFSBucket } = require('mongodb');
const pdf = require('pdf-parse');
const axios = require('axios');

// MongoDB 連接設定
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'ragdb';
let db, client, gfsBucket;

// 基本設定
const config = {
  embeddingModel: 'nomic-embed-text',
  languageModel: 'llama3.2-vision:11b',
};

/**
 * 計算兩個向量之間的餘弦相似度
 * @param {Array} vecA - 向量A
 * @param {Array} vecB - 向量B
 * @returns {number} - 相似度分數 (0-1)
 */
exports.calculateCosineSimilarity = function(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
};

/**
 * 初始化 MongoDB 連接
 */
exports.initMongoDB = async function() {
  if (db) return { db, gfsBucket };
  
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    console.log('已連接到 MongoDB');
    
    db = client.db(dbName);
    gfsBucket = new GridFSBucket(db, {
      bucketName: 'pdfFiles'
    });
    
    // 確保必要的集合存在
    await db.createCollection('documents');
    await db.createCollection('embeddings');
    
    // 添加文本索引
    try {
      await db.collection('documents').createIndex({ text: "text" });
      console.log("文本索引創建成功");
    } catch (indexError) {
      console.warn("文本索引創建失敗或已存在:", indexError.message);
    }
    
    return { db, gfsBucket };
  } catch (error) {
    console.error('MongoDB 連接失敗:', error);
    throw error;
  }
};

/**
 * 使用 Ollama 生成文本嵌入向量
 * @param {string} text - 需要嵌入的文本
 * @param {string} model - 嵌入模型名稱
 * @returns {Promise<Array>} - 嵌入向量
 */
exports.createEmbedding = async function(text, model = config.embeddingModel) {
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
};

/**
 * 使用 Ollama 生成文本回應
 * @param {string} prompt - 提示詞
 * @param {string} model - 語言模型名稱
 * @returns {Promise<string>} - 生成的回應
 */
exports.generateResponse = async function(prompt, model = config.languageModel) {
  try {
    console.log(`正在使用模型 ${model} 處理查詢...`);
    console.log(`處理開始時間: ${new Date().toISOString()}`);
    
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: model,
      prompt: prompt,
      stream: false
    }, { 
      timeout: 0
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
};

/**
 * 使用 Ollama 流式生成文本回應
 * @param {string} prompt - 提示詞
 * @param {string} model - 語言模型名稱
 * @returns {Promise<ReadableStream>} - 回應流
 */
exports.generateResponseStream = async function(prompt, model = config.languageModel) {
  try {
    console.log(`正在使用模型 ${model} 流式處理查詢...`);
    console.log(`處理開始時間: ${new Date().toISOString()}`);
    
    // 返回一個 Promise 和流控制器
    return axios({
      method: 'post',
      url: 'http://localhost:11434/api/generate',
      data: {
        model: model,
        prompt: prompt,
        stream: true
      },
      responseType: 'stream',
      timeout: 0
    });
  } catch (error) {
    console.error('創建流式生成失敗:', error.message);
    throw error;
  }
};

/**
 * 讀取並解析 PDF 文件
 * @param {string} filePath - PDF 檔案路徑
 * @returns {Promise<string>} - PDF 文本內容
 */
exports.readPdf = async function(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF 讀取失敗:', error);
    throw error;
  }
};

/**
 * 將 PDF 文件及其文本內容存儲到 MongoDB (支援公共和私人模式)
 * @param {string} filePath - PDF 檔案路徑
 * @param {string} embeddingModel - 嵌入模型名稱
 * @param {string} userId - 用戶ID (可選，公共文件時為null)
 * @param {boolean} isPublic - 是否為公共文件
 * @returns {Promise<object>} - 文檔對象
 */
exports.storePdfToGridFS = async function(filePath, embeddingModel = config.embeddingModel, userId = null, isPublic = true) {
  if (!db || !gfsBucket) {
    await exports.initMongoDB();
  }
  
  try {
    const fileName = path.basename(filePath);
    
    // 存儲原始 PDF 文件到 GridFS
    const uploadStream = gfsBucket.openUploadStream(fileName, {
      metadata: { 
        type: 'pdf', 
        originalName: fileName,
        userId: userId,
        isPublic: isPublic,
        uploadDate: new Date(),
        contentType: 'application/pdf'
      }
    });
    
    // 創建讀取流並上傳到 GridFS
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(uploadStream);
    
    return new Promise((resolve, reject) => {
      uploadStream.on('finish', async () => {
        try {
          console.log(`PDF 文件已存儲到 GridFS，文件ID: ${uploadStream.id}`);
          
          // 提取文本
          const pdfText = await exports.readPdf(filePath);
          console.log(`PDF 文本提取完成，長度: ${pdfText.length} 字元`);
          
          // 生成嵌入向量
          const embedding = await exports.createEmbedding(pdfText, embeddingModel);
          console.log(`嵌入向量生成完成，維度: ${embedding.length}`);
          
          // 保存文檔信息和文本內容
          const doc = {
            fileId: uploadStream.id, // GridFS 文件ID
            fileName: fileName,
            text: pdfText,
            userId: userId,
            isPublic: isPublic,
            uploadDate: new Date(),
            processed: true,
            contentType: 'application/pdf'
          };
          
          const result = await db.collection('documents').insertOne(doc);
          console.log(`文檔信息已保存，文檔ID: ${result.insertedId}`);
          
          // 保存嵌入向量
          await db.collection('embeddings').insertOne({
            documentId: result.insertedId,
            embedding: embedding,
            model: embeddingModel,
            userId: userId,
            isPublic: isPublic
          });
          console.log('嵌入向量已保存');
          
          resolve({
            documentId: result.insertedId,
            fileName,
            fileId: uploadStream.id,
            textLength: pdfText.length
          });
        } catch (error) {
          console.error('PDF 處理失敗:', error);
          reject(error);
        }
      });
      
      uploadStream.on('error', (error) => {
        console.error('GridFS 上傳失敗:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('PDF 存儲失敗:', error);
    throw error;
  }
};

/**
 * 從 GridFS 獲取 PDF 文件流
 * @param {string} fileId - GridFS 文件ID
 * @param {string} userId - 用戶ID (用於權限檢查)
 * @returns {Promise<object>} - 包含文件流和文件信息的對象
 */
exports.getPdfFileStream = async function(fileId, userId = null) {
  if (!db || !gfsBucket) {
    await exports.initMongoDB();
  }
  
  try {
    // 首先檢查文件是否存在
    const fileInfo = await gfsBucket.find({ _id: new ObjectId(fileId) }).toArray();
    
    if (fileInfo.length === 0) {
      throw new Error('文件不存在');
    }
    
    const file = fileInfo[0];
    
    // 檢查權限
    if (!file.metadata.isPublic && file.metadata.userId !== userId) {
      throw new Error('無權限訪問此文件');
    }
    
    // 創建下載流
    const downloadStream = gfsBucket.openDownloadStream(new ObjectId(fileId));
    
    return {
      stream: downloadStream,
      filename: file.filename,
      contentType: file.metadata.contentType || 'application/pdf',
      length: file.length,
      metadata: file.metadata
    };
  } catch (error) {
    console.error('獲取 PDF 文件流失敗:', error);
    throw error;
  }
};

/**
 * 獲取 PDF 文件信息
 * @param {string} fileId - GridFS 文件ID
 * @param {string} userId - 用戶ID (用於權限檢查)
 * @returns {Promise<object>} - 文件信息
 */
exports.getPdfFileInfo = async function(fileId, userId = null) {
  if (!db || !gfsBucket) {
    await exports.initMongoDB();
  }
  
  try {
    const fileInfo = await gfsBucket.find({ _id: new ObjectId(fileId) }).toArray();
    
    if (fileInfo.length === 0) {
      throw new Error('文件不存在');
    }
    
    const file = fileInfo[0];
    
    // 檢查權限
    if (!file.metadata.isPublic && file.metadata.userId !== userId) {
      throw new Error('無權限訪問此文件');
    }
    
    return {
      fileId: file._id,
      filename: file.filename,
      length: file.length,
      uploadDate: file.uploadDate,
      contentType: file.metadata.contentType || 'application/pdf',
      isPublic: file.metadata.isPublic,
      userId: file.metadata.userId
    };
  } catch (error) {
    console.error('獲取 PDF 文件信息失敗:', error);
    throw error;
  }
};

/**
 * 查詢與用戶問題相似的文檔內容
 * @param {string} query - 用戶查詢
 * @param {string} embeddingModel - 嵌入模型名稱
 * @param {string} userId - 用戶ID (可選，用於權限控制)
 * @param {boolean} usePublicData - 是否使用公共數據
 * @param {string} specificDocumentId - 特定文檔ID (可選)
 * @returns {Promise<Array>} - 相關文檔列表，按相似度排序
 */
exports.querySimilarContent = async function(query, embeddingModel = config.embeddingModel, userId = null, usePublicData = true, specificDocumentId = null) {
  if (!db) {
    await exports.initMongoDB();
  }

  try {
    // 生成查詢嵌入向量
    console.log(`為查詢生成嵌入向量: "${query.substring(0, 30)}..."`);
    const queryEmbedding = await exports.createEmbedding(query, embeddingModel);
    
    // 建立查詢條件
    let embeddingsQuery = {};
    
    if (specificDocumentId) {
      // 如果指定了文檔ID，只查詢該文檔
      embeddingsQuery.documentId = new ObjectId(specificDocumentId);
    } else {
      // 根據查詢權限設定條件
      if (usePublicData && userId) {
        // 公共數據 + 用戶私人數據
        embeddingsQuery.$or = [
          { isPublic: true },
          { userId: userId }
        ];
      } else if (usePublicData) {
        // 僅公共數據
        embeddingsQuery.isPublic = true;
      } else if (userId) {
        // 僅用戶私人數據
        embeddingsQuery.userId = userId;
      } else {
        throw new Error('必須指定查詢範圍：公共數據或用戶私人數據');
      }
    }
    
    // 獲取所有符合條件的嵌入向量
    const embeddings = await db.collection('embeddings').find(embeddingsQuery).toArray();
    console.log(`找到 ${embeddings.length} 個符合條件的嵌入向量`);
    
    if (embeddings.length === 0) {
      return [];
    }
    
    // 計算相似度並排序
    const scoredEmbeddings = embeddings.map(embedding => {
      const similarity = exports.calculateCosineSimilarity(queryEmbedding, embedding.embedding);
      return {
        documentId: embedding.documentId,
        model: embedding.model,
        score: similarity,
        isPublic: embedding.isPublic,
        userId: embedding.userId
      };
    });
    
    // 按相似度降序排序
    scoredEmbeddings.sort((a, b) => b.score - a.score);
    
    // 只保留相似度較高的結果 (閾值 0.3)
    const relevantEmbeddings = scoredEmbeddings.filter(e => e.score > 0.3);
    
    if (relevantEmbeddings.length === 0) {
      console.log('沒有找到相似度足夠高的文檔');
      return [];
    }
    
    // 獲取完整的文檔內容
    const results = [];
    for (const embeddingResult of relevantEmbeddings.slice(0, 3)) { // 最多返回前 3 個結果
      const document = await db.collection('documents').findOne({ _id: embeddingResult.documentId });
      if (document) {
        results.push({
          documentId: document._id.toString(),
          fileName: document.fileName,
          text: document.text,
          score: embeddingResult.score,
          isPublic: document.isPublic,
          userId: document.userId
        });
      }
    }
    
    console.log(`最終返回 ${results.length} 個相關文檔結果`);
    return results;
  } catch (error) {
    console.error('查詢相似內容失敗:', error);
    throw error;
  }
};

/**
 * 執行 RAG 問答流程 (支援公共和私人數據)
 * @param {string} query - 用戶查詢
 * @param {string} embeddingModel - 嵌入模型名稱
 * @param {string} languageModel - 語言模型名稱
 * @param {string} userId - 用戶ID (可選)
 * @param {boolean} usePublicData - 是否使用公共數據
 * @param {string} specificDocumentId - 特定文檔ID (可選)
 * @returns {Promise<object>} - 包含回應和相關文檔的結果
 */
exports.performRagQuery = async function(query, embeddingModel = config.embeddingModel, languageModel = config.languageModel, userId = null, usePublicData = true, specificDocumentId = null) {
  try {
    // 1. 獲取相關文檔 (添加 specificDocumentId 參數)
    const results = await exports.querySimilarContent(query, embeddingModel, userId, usePublicData, specificDocumentId);
    
    if (results.length === 0) {
      return {
        success: false,
        message: "找不到相關文檔",
        query,
        response: "很抱歉，我找不到與您問題相關的資訊。"
      };
    }
    
    console.log(`找到相關文檔: ${results[0].fileName} (${results[0].isPublic ? '公共' : '私人'})`);
    
    // 2. 從最相關的文檔準備上下文
    const relevantText = results[0].text;
    
    // 檢查文本長度，可能需要截斷
    const truncatedText = relevantText.length > 4000 
      ? relevantText.substring(0, 4000) + "..." 
      : relevantText;
    
    // 3. 構建提示詞
    const prompt = `
你是一個專業的助理，負責根據提供的文檔內容回答問題。
請只根據以下文檔內容回答問題，如果文檔中沒有相關資訊，請直接說明無法回答。
不要編造不在文檔中的資訊。

===文檔內容開始===
${truncatedText}
===文檔內容結束===

問題: ${query}

回答:
    `;
    
    // 4. 使用 LLM 生成回應
    const response = await exports.generateResponse(prompt, languageModel);
    
    // 5. 返回結果
    return {
      success: true,
      query,
      response,
      documentInfo: {
        documentId: results[0].documentId,
        fileName: results[0].fileName,
        relevanceScore: results[0].score,
        isPublic: results[0].isPublic
      }
    };
  } catch (error) {
    console.error('RAG 查詢處理失敗:', error);
    return {
      success: false,
      message: `處理查詢時發生錯誤: ${error.message}`,
      query,
      response: "處理您的問題時發生了技術問題，請稍後再試。"
    };
  }
};

/**
 * 執行 RAG 問答流程 (流式輸出版本)
 * @param {string} query - 用戶查詢
 * @param {string} embeddingModel - 嵌入模型名稱
 * @param {string} languageModel - 語言模型名稱
 * @param {string} userId - 用戶ID (可選)
 * @param {boolean} usePublicData - 是否使用公共數據
 * @param {string} specificDocumentId - 特定文檔ID (可選)
 * @param {function} onChunk - 處理每個回應塊的回調函數
 * @returns {Promise<object>} - 包含完整回應和相關文檔的結果
 */
exports.performRagQueryStream = async function(query, embeddingModel = config.embeddingModel, languageModel = config.languageModel, userId = null, usePublicData = true, specificDocumentId = null, onChunk) {
  try {
    // 1. 獲取相關文檔
    const results = await exports.querySimilarContent(query, embeddingModel, userId, usePublicData, specificDocumentId);
    
    if (results.length === 0) {
      const errorMessage = "很抱歉，我找不到與您問題相關的資訊。";
      // 如果提供了回調，通過回調發送錯誤消息
      if (typeof onChunk === 'function') {
        onChunk(errorMessage);
        onChunk('[DONE]');
      }
      
      return {
        success: false,
        message: "找不到相關文檔",
        query,
        response: errorMessage
      };
    }
    
    console.log(`找到相關文檔: ${results[0].fileName} (${results[0].isPublic ? '公共' : '私人'})`);
    
    // 2. 從最相關的文檔準備上下文
    const relevantText = results[0].text;
    
    // 檢查文本長度，可能需要截斷
    const truncatedText = relevantText.length > 4000 
      ? relevantText.substring(0, 4000) + "..." 
      : relevantText;
    
    // 3. 構建提示詞
    const prompt = `
你是一個專業的助理，負責根據提供的文檔內容回答問題。
請只根據以下文檔內容回答問題，如果文檔中沒有相關資訊，請直接說明無法回答。
不要編造不在文檔中的資訊。

===文檔內容開始===
${truncatedText}
===文檔內容結束===

問題: ${query}

回答:
    `;
    
    // 4. 使用 LLM 流式生成回應
    try {
      // 獲取流式響應
      const response = await exports.generateResponseStream(prompt, languageModel);
      let fullResponse = '';
      
      // 設置響應處理
      response.data.on('data', (chunk) => {
        try {
          const lines = chunk.toString().split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              // 解析 JSON 數據
              const data = JSON.parse(line);
              
              // 提取響應內容
              if (data.response) {
                fullResponse += data.response;
                
                // 如果提供了回調函數，將每個塊發送給回調
                if (typeof onChunk === 'function') {
                  onChunk(data.response);
                }
              }
            } catch (e) {
              console.warn('無法解析 JSON 行:', line, e);
            }
          }
        } catch (e) {
          console.error('流處理錯誤:', e);
        }
      });
      
      // 等待流完成
      await new Promise((resolve, reject) => {
        response.data.on('end', () => {
          if (typeof onChunk === 'function') {
            onChunk('[DONE]');
          }
          resolve();
        });
        
        response.data.on('error', (err) => {
          console.error('流錯誤:', err);
          reject(err);
        });
      });
      
      // 5. 返回完整結果
      return {
        success: true,
        query,
        response: fullResponse,
        documentInfo: {
          documentId: results[0].documentId,
          fileName: results[0].fileName,
          relevanceScore: results[0].score,
          isPublic: results[0].isPublic
        }
      };
    } catch (streamError) {
      console.error('流式處理失敗，嘗試使用非流式模式:', streamError);
      
      // 如果流式處理失敗，回退到非流式處理
      const response = await exports.generateResponse(prompt, languageModel);
      
      // 如果提供了回調，發送完整回應和結束標記
      if (typeof onChunk === 'function') {
        onChunk(response);
        onChunk('[DONE]');
      }
      
      return {
        success: true,
        query,
        response,
        documentInfo: {
          documentId: results[0].documentId,
          fileName: results[0].fileName,
          relevanceScore: results[0].score,
          isPublic: results[0].isPublic
        }
      };
    }
  } catch (error) {
    console.error('RAG 查詢處理失敗:', error);
    
    const errorMessage = `處理您的問題時發生了技術問題: ${error.message}`;
    
    // 如果提供了回調，通過回調發送錯誤消息
    if (typeof onChunk === 'function') {
      onChunk(errorMessage);
      onChunk('[DONE]');
    }
    
    return {
      success: false,
      message: `處理查詢時發生錯誤: ${error.message}`,
      query,
      response: errorMessage
    };
  }
};

/**
 * 獲取用戶的私人文檔列表
 * @param {string} userId - 用戶ID
 * @returns {Promise<Array>} - 文檔列表
 */
exports.getUserDocuments = async function(userId) {
  if (!db) {
    await exports.initMongoDB();
  }
  
  try {
    const documents = await db.collection('documents')
      .find({ userId: userId, isPublic: false })
      .sort({ uploadDate: -1 })
      .toArray();
    
    return documents.map(doc => ({
      documentId: doc._id.toString(),
      fileName: doc.fileName,
      uploadDate: doc.uploadDate,
      processed: doc.processed,
      textLength: doc.text ? doc.text.length : 0,
      isPublic: doc.isPublic
    }));
  } catch (error) {
    console.error('獲取用戶文檔列表失敗:', error);
    throw error;
  }
};

/**
 * 獲取公共文檔列表
 * @returns {Promise<Array>} - 文檔列表
 */
exports.getPublicDocuments = async function() {
  if (!db) {
    await exports.initMongoDB();
  }
  
  try {
    const documents = await db.collection('documents')
      .find({ isPublic: true })
      .sort({ uploadDate: -1 })
      .toArray();
    
    return documents.map(doc => ({
      documentId: doc._id.toString(),
      fileName: doc.fileName,
      uploadDate: doc.uploadDate,
      processed: doc.processed,
      textLength: doc.text ? doc.text.length : 0,
      isPublic: doc.isPublic
    }));
  } catch (error) {
    console.error('獲取公共文檔列表失敗:', error);
    throw error;
  }
};

/**
 * 查詢特定文檔
 * @param {string} documentId - 文檔ID
 * @param {string} query - 用戶查詢
 * @param {string} userId - 用戶ID (用於權限檢查)
 * @returns {Promise<object>} - 包含回應和相關文檔的結果
 */
exports.querySpecificDocument = async function(documentId, query, userId = null) {
  if (!db) {
    await this.initMongoDB();
  }
  
  try {
    // 檢查文檔是否存在且用戶是否有權訪問
    const document = await db.collection('documents').findOne({
      _id: new ObjectId(documentId),
      $or: [
        { isPublic: true },
        { userId: userId }
      ]
    });

    if (!document) {
      throw new Error('文檔不存在或您沒有權限訪問');
    }

    // 獲取文檔的內容
    const chunks = await db.collection('documents.chunks').find({
      fileId: document.fileId
    }).sort({ n: 1 }).toArray();

    // 從分塊中獲取文檔內容
    let documentText = '';
    for (const chunk of chunks) {
      if (chunk.content) {
        documentText += chunk.content;
      }
    }

    // 根據用戶查詢生成答案
    const queryEmbedding = await this.createEmbedding(query);
    
    // 計算文檔中各段落的相似度，找出最相關的段落
    const paragraphs = documentText.split('\n\n').filter(p => p.trim().length > 0);
    
    const relevantParagraphs = [];
    for (const paragraph of paragraphs) {
      if (paragraph.trim().length < 10) continue; // 忽略太短的段落
      
      const paragraphEmbedding = await this.createEmbedding(paragraph);
      const similarity = this.calculateCosineSimilarity(queryEmbedding, paragraphEmbedding);
      
      if (similarity > 0.3) { // 相似度閾值
        relevantParagraphs.push({
          text: paragraph,
          similarity: similarity
        });
      }
    }
    
    // 按相似度排序
    relevantParagraphs.sort((a, b) => b.similarity - a.similarity);
    
    // 取最相關的幾段
    const topParagraphs = relevantParagraphs.slice(0, 3);
    
    // 構建提示詞
    const prompt = `
    下面是來自文檔 "${document.filename}" 的相關信息：
    ${topParagraphs.map(p => p.text).join('\n\n')}
    
    根據上述信息，請回答以下問題：
    ${query}
    `;
    
    // 生成回應
    const response = await this.generateResponse(prompt);
    
    return {
      response: response,
      document: {
        id: document._id,
        filename: document.filename,
        relevantParagraphs: topParagraphs.map(p => p.text)
      }
    };
  } catch (error) {
    console.error('查詢特定文檔失敗:', error);
    throw error;
  }
};