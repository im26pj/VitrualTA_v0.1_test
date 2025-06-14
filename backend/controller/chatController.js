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
const debug = require('debug')('app:userController'); // 引入 debug 並設定命名空間

// 在文件頂部添加 API_BASE_URL 常量
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// 引入 child_process 來運行 Python 腳本
const { spawn } = require('child_process');

// 修改 spawn_1 函數
const spawn_1 = async function(prompt, userId, chat_id, lora_name, num_images, model_arg, webui_style_model_name) {
  // 若 lora_name 不為空但不是絕對路徑，則转换為絕對路徑
  if (lora_name && !path.isAbsolute(lora_name)) {
    const loraPath = path.join(__dirname, '../stable-diffusion/loras/', lora_name);
    lora_name = loraPath;
  }
  
  // 新增: 若 webui_style_model_name 不為空但不是絕對路徑，轉換為絕對路徑
  if (webui_style_model_name && !path.isAbsolute(webui_style_model_name)) {
    const styleModelPath = path.join(__dirname, '../stable-diffusion/models/', webui_style_model_name);
    webui_style_model_name = styleModelPath;
  }
  
  // 確保 num_images 是有效的數字
  num_images = num_images ? parseInt(num_images) : 1;
  
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../stable-diffusion/diffusion_1.5.py');
    const pythonExecutable = path.join(__dirname, '../stable-diffusion/.graphenv/Scripts/python.exe');

    debug(`執行 Python 腳本: ${scriptPath}`);
    debug(`使用 Python 路徑: ${pythonExecutable}`);
    debug(`參數: ${prompt}, ${userId}, ${chat_id}, ${lora_name}, ${num_images}, ${model_arg}, ${webui_style_model_name}`);

    const pythonProcess = spawn(
      pythonExecutable,
      [scriptPath, prompt, userId, chat_id, lora_name || "", num_images, model_arg || "", webui_style_model_name || ""],
      {
        env: { ...process.env }
      }
    );

    let outputData = '';
    let errorData = '';

    // 收集標準輸出
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    // 收集錯誤輸出
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      debug(`Python 腳本錯誤: ${data}`); // 只記錄錯誤信息到 debug，不返回給前端
    });

    // 腳本執行完畢後處理結果
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        debug(`Python 腳本執行失敗 (退出碼 ${code}): ${errorData}`);
        reject(new Error(`圖片生成失敗: ${errorData}`));
        return;
      }

      try {
        debug('Python 輸出原始內容:', outputData);
        
        // 先尋找多圖片格式 {"_ids": [...]} 的 JSON 字串
        const idsJsonRegex = /\{\s*"_ids"\s*:\s*\[\s*"[^"]+(?:",\s*"[^"]+)*"\s*\]\s*\}/g;
        const idsMatch = outputData.match(idsJsonRegex);
        
        if (idsMatch && idsMatch.length > 0) {
          const jsonStr = idsMatch[idsMatch.length - 1]; // 取最後一個匹配
          debug('提取的多圖片 JSON 字符串:', jsonStr);
          
          try {
            // 解析 JSON
            const result = JSON.parse(jsonStr);
            debug('成功解析多圖片 JSON:', result);
            resolve(result);
            return;
          } catch (parseError) {
            debug('多圖片 JSON 解析錯誤:', parseError);
            // 繼續嘗試其他提取方法
          }
        }
        
        // 如果沒找到多圖片格式，再尋找單圖片格式 {"_id": "xxx"}
        const idJsonRegex = /\{\s*"_id"\s*:\s*"[^"]+"\s*\}/g;
        const idMatch = outputData.match(idJsonRegex);
        
        if (idMatch && idMatch.length > 0) {
          const jsonStr = idMatch[idMatch.length - 1]; // 取最後一個匹配
          debug('提取的單圖片 JSON 字符串:', jsonStr);
          
          try {
            // 解析 JSON
            const result = JSON.parse(jsonStr);
            debug('成功解析單圖片 JSON:', result);
            resolve(result);
            return;
          } catch (parseError) {
            debug('單圖片 JSON 解析錯誤:', parseError);
            // 繼續嘗試其他提取方法
          }
        }
        
        // 備用方法：尋找最後一個有效的 JSON 對象
        const lastOpenBrace = outputData.lastIndexOf('{');
        const lastCloseBrace = outputData.lastIndexOf('}');
        
        if (lastOpenBrace !== -1 && lastCloseBrace !== -1 && lastOpenBrace < lastCloseBrace) {
          try {
            const jsonCandidate = outputData.substring(lastOpenBrace, lastCloseBrace + 1);
            debug('備用方法提取的 JSON 候選字符串:', jsonCandidate);
            
            const result = JSON.parse(jsonCandidate);
            debug('成功使用備用方法解析 JSON:', result);
            resolve(result);
            return;
          } catch (parseError) {
            debug('備用方法解析失敗:', parseError);
            // 嘗試進一步處理
          }
        }
        
        // 最後嘗試：從輸出中找到 _id 或 _ids 部分並手動構建 JSON
        const idsPattern = /"_ids"\s*:\s*\[\s*"([^"]+(?:",\s*"[^"]+)*)"\s*\]/;
        const idsMatch2 = outputData.match(idsPattern);
        
        if (idsMatch2 && idsMatch2[1]) {
          const fileIds = idsMatch2[1].split('","').map(id => id.trim());
          debug('從輸出中提取的檔案 IDs:', fileIds);
          resolve({ _ids: fileIds });
          return;
        }
        
        const idPattern = /"_id"\s*:\s*"([^"]+)"/;
        const idMatch2 = outputData.match(idPattern);
        
        if (idMatch2 && idMatch2[1]) {
          const fileId = idMatch2[1];
          debug('從輸出中提取的檔案 ID:', fileId);
          resolve({ _id: fileId });
          return;
        }
        
        debug('無法在輸出中找到有效的 JSON 對象或檔案 ID');
        reject(new Error('無法在 Python 輸出中找到有效的 JSON 對象'));
        
      } catch (err) {
        debug('無法解析 Python 輸出:', outputData);
        debug('解析錯誤:', err);
        reject(new Error(`解析圖片生成結果失敗: ${err.message}`));
      }
    });
  });
};

// 修改 spawn_3 函數
const spawn_3 = async function(prompt, userId, chat_id, model_variant = "medium") {
  // model_variant 可以是 "medium" 或 "large" 等
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../stable-diffusion/diffusion_3.5.py');
    
    // 修正：使用相同的虛擬環境
    const pythonExecutable = path.join(__dirname, '../stable-diffusion/.graphenv/Scripts/python.exe');
    
    debug(`執行 Python 腳本: ${scriptPath}`);
    debug(`使用 Python 路徑: ${pythonExecutable}`);
    debug(`參數: ${prompt}, ${userId}, ${chat_id}, ${model_variant}`);

    // 直接執行 Python 腳本
    const pythonProcess = spawn(
      pythonExecutable,
      [scriptPath, prompt, userId, chat_id, model_variant],
      {
        env: { ...process.env }
      }
    );
    
    let outputData = '';
    let errorData = '';
    
    // 收集標準輸出
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    // 收集錯誤輸出
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      debug(`Python 腳本錯誤: ${data}`);
    });
    
    // 腳本執行完畢後處理結果
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        debug(`Python 腳本執行失敗 (退出碼 ${code}): ${errorData}`);
        reject(new Error(`圖片生成失敗: ${errorData}`));
        return;
      }
      
      try {
        debug('Python 輸出原始內容:', outputData);
        
        // 嘗試尋找並提取 JSON 對象
        const jsonRegex = /{[\s\S]*}/;
        const match = outputData.match(jsonRegex);
        
        if (match) {
          const jsonStr = match[0];
          debug('提取的 JSON 字符串:', jsonStr);
          
          // 解析 JSON
          const result = JSON.parse(jsonStr);
          resolve(result);
        } else {
          debug('無法在輸出中找到 JSON 對象');
          reject(new Error('無法在 Python 輸出中找到有效的 JSON 對象'));
        }
      } catch (err) {
        debug('無法解析 Python 輸出:', outputData);
        debug('解析錯誤:', err);
        reject(new Error(`解析圖片生成結果失敗: ${err.message}`));
      }
    });
  });
};

// 配置 multer 存儲
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 提高到 100MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳圖片檔案'));
    }
  }
}).array('images', 5); // 允許最多上傳5張圖片

// 1. 首先添加內部函數 
async function generateGraphInternal(content, userId, chat_id, graph_type , tunnel = "OLD" , model = "sd15" , lora_name = "" , genpic_num = 1 , webui_style_model_name = "") {
  let prompt_generate = '';
  if(graph_type.toUpperCase() == "MINDMAP") {   
    prompt_generate = `
      請根據以下描述建立一個階層式的節點結構，回傳格式為**嵌套的 JSON**，代表一個樹狀結構。每個節點都包含 "name"，如有子節點則包含 "children" 欄位，並遵守以下格式：

      範例格式：
      {"name": "中心主題","children": [{"name": "子節點 1"},{"name": "子節點 2","children": [{"name": "子節點 2-1"},{"name": "子節點 2-2","children": [{"name": "子節點2-2-1"}]}]}]}
      不要加入任何說明、註解或文字，內文使用繁體中文，僅回傳符合上述格式的 JSON 結構。
      描述：
      ${content}
    `;
  }
  else if(graph_type.toUpperCase() == "SCD") {
    //console.log("進入 SCD 生成邏輯function");
    debug("進入 SCD 生成邏輯function");
    prompt_generate = `
    請根據下面的需求與描述，建立一個簡單的系統上下文圖，使用繁體中文描述，並回傳乾淨的 JSON，不要包含任何其他說明文字。  
    JSON 格式必須包含兩個屬性：  
      1. nodes：節點陣列，每個節點都要有 id（字串）與 type（"external"、"process" 等）  
      2. links：連結陣列，每個連結要有 source、target（都對應到 nodes 裡的 id）和 label（字串）  

    請依照下面的範例格式回傳，且盡可能完整的敘述資料流動：  
    {
      "nodes": [
        {
          "id": "User",
          "type": "external"
        },
        {
          "id": "通常是主題名稱或其他外部實體",
          "type": "process"
        }
        // …（如有其他節點就繼續往下寫）  
      ],
      "links": [
        {
          "source": "User",
          "target": "主題名稱或其他外部實體",
          "label": "敘述資料/指令"
        },
        {
          "source": "User",
          "target": "主題名稱或其他外部實體",
          "label": "敘述資料/指令"
        },
        ...
        {
          "source": "主題名稱或其他外部實體",
          "target": "User",
          "label": "敘述資料/指令"
        },
        {
          "source": "主題名稱或其他外部實體",
          "target": "User",
          "label": "敘述資料/指令"
        },
        {
          "source": "主題名稱或其他外部實體",
          "target": "User",
          "label": "敘述資料/指令"
        },
        ...
      ]
    }
    描述：
    ${content}
    `;
  }else if (graph_type.toUpperCase() == "OTHER"){
    //console.log("進入 Diffusion 生成邏輯function");
    debug("進入 Diffusion 生成邏輯function");
    if (tunnel.toUpperCase() == "OLD"){
      prompt_generate =`請根據以下使用者描述的內容，完善並擴展描述細節，並且回傳英文回復且不能超過256個Token
      描述：
      ${content}
      `
      const response = await ollama.chat({
      model: 'llama3.2-vision:11b',
      messages: [
        {
          role: 'user',
          content: prompt_generate
        }
      ],
      stream: false
      });

      let fullResponse = response.message.content;
      // 將 fullResponse 傳入 diffusion 3.5 腳本
      //console.log(`生成圖片的優化提示 (3.5模型): ${fullResponse}`);
      debug(`生成圖片的優化提示 (${model}): ${fullResponse}`);
      try {
        // 調用 spawn_3 函數，它會執行 Python 腳本並返回包含圖片 ID 的結果
        const imageResult = await spawn_3(fullResponse, userId, chat_id);
        
        // 檢查生成結果
        if (imageResult && imageResult._id) {
          //console.log(`圖片生成成功 (3.5模型)，ID: ${imageResult._id}`);
          debug(`圖片生成成功 (${model})，ID: ${imageResult._id}`);
          // 返回圖片結果 - Python 腳本已經把圖片存入 GridFS，所以這裡不需要再存
          return {
            success: true,
            imageId: imageResult._id,
            url: `${API_BASE_URL}/api/images/${imageResult._id}`,
            model: "3.5"  // 添加模型資訊，方便前端區分
          };
        } else {
          throw new Error('圖片生成失敗 (${model})');
        }
      } catch (error) {
        //console.error('Diffusion 3.5 圖片生成錯誤:', error);
        debug('Diffusion 3.5 圖片生成錯誤:', error);
        throw error;
      }
    }
    // 修改 1.5 模型部分的代碼
    else if (tunnel.toUpperCase() == "NEW") 
    {
      prompt_generate = `請根據以下使用者描述的內容，完善並擴展描述細節，並且回傳英文回復且不能超過72個Token
      描述：
      ${content}
      `
      const response = await ollama.chat({
        model: 'llama3.2-vision:11b',
        messages: [
          {
            role: 'user',
            content: prompt_generate
          }
        ],
        stream: false
      });

      let fullResponse = response.message.content;
      // 將 fullResponse 傳入 diffusion 1.5 腳本
      //console.log(`生成圖片的優化提示: ${fullResponse}`);
      debug(`生成圖片的優化提示: ${fullResponse}`);
      try {
        // 調用 spawn_1 函數，它會執行 Python 腳本並返回包含圖片 ID 的結果
        const imageResult = await spawn_1(
          fullResponse, 
          userId, 
          chat_id, 
          lora_name || null, 
          genpic_num ? parseInt(genpic_num) : 1, 
          webui_style_model_name || ""
        );
        
        // 添加調試信息
        debug(`spawn_1 調用參數: prompt=${fullResponse}, userId=${userId}, chat_id=${chat_id}, lora_name=${lora_name}, genpic_num=${genpic_num}, webui_style_model_name=${webui_style_model_name}`);
        debug(`spawn_1 返回結果:`, imageResult);
        
        // 檢查生成結果 - 修改以支援多圖片
        if (imageResult) {
          // 處理單圖片情況
          if (imageResult._id) {
            debug(`單圖生成成功，ID: ${imageResult._id}`);
            return {
              success: true,
              imageId: imageResult._id,
              url: `${API_BASE_URL}/api/images/${imageResult._id}`
            };
          }
          // 處理多圖片情況
          else if (imageResult._ids && Array.isArray(imageResult._ids) && imageResult._ids.length > 0) {
            debug(`多圖生成成功，共 ${imageResult._ids.length} 張，IDs: ${imageResult._ids.join(', ')}`);
            return {
              success: true,
              multipleImages: true, // 標記為多張圖片
              imageIds: imageResult._ids,
              urls: imageResult._ids.map(id => `${API_BASE_URL}/api/images/${id}`)
            };
          } else {
            throw new Error('圖片生成結果格式無效');
          }
        } else {
          throw new Error('圖片生成失敗');
        }
      } catch (error) {
        debug('Diffusion 1.5 圖片生成錯誤:', error);
        throw error;
      }
    }


  }


  try {
    const response = await ollama.chat({
      model: 'llama3.2-vision:11b',
      messages: [
        {
          role: 'user',
          content: prompt_generate
        }
      ],
      stream: false
    });

    let fullResponse = response.message.content;
    let cleanedResponse = fullResponse;
    
    if (cleanedResponse.includes('```json')) {
      cleanedResponse = cleanedResponse
        .split('```json')[1]
        .split('```')[0]
        .trim();
    }
    
    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    }

    const parsedResponse = JSON.parse(cleanedResponse);

    // Save to database if userId and chat_id are provided
    if (userId && chat_id) {
      let chatDoc = await Chat.findOne({ chat_id, userId });
      
      if (!chatDoc) {
        chatDoc = new Chat({
          userId,
          chat_id,
          title: content.substring(0, 50) + '...',
          chat_history: [],
          updated_at: new Date()
        });
      }

      // 修改這裡：確保存入完整的圖表數據，並轉換為字串形式
      chatDoc.chat_history.push({
        role: 'assistant',
        graph_json: JSON.stringify(parsedResponse, null, 2),  // 轉換為格式化的 JSON 字串
        timestamp: new Date()
      });

      chatDoc.updated_at = new Date();
      await chatDoc.save();
    }

    return parsedResponse;
  } catch (error) {
    // 使用函数的参数来追踪重试次数
    async function retryGenerate(retryCount = 1) {
      //console.error(`generateGraphInternal error ${retryCount}:`, error);
      debug(`generateGraphInternal error ${retryCount}:`, error);

      if (retryCount < 2) {
        try { 
          return await generateGraphInternal(content, userId, chat_id, graph_type , tunnel  , model , lora_name , genpic_num  , webui_style_model_name );
        } catch (retryError) {
          return await retryGenerate(retryCount + 1);
        }
      }
      throw new Error('圖片生成失敗');
    }

    return await retryGenerate();
  }
}

// 2. 修改原本的 API endpoint，使用內部函數
// 生成json 給前端渲染
exports.generateGraph = async (req, res) => {
  const { isVisitor, chat_id, content , graph_type , tunnel ,model,  lora_name , genpic_num , webui_style_model_name} = req.body;
  const authHeader = req.headers.authorization;

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

    const result = await generateGraphInternal(content, userId, chat_id , graph_type , tunnel , model ,  lora_name , genpic_num , webui_style_model_name);
    
    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    //console.error('生成圖表錯誤:', err);
    debug('生成圖表錯誤:', err);
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

exports.chatWithOllama = async (req, res) => {
  const { conversationHistory, isVisitor, chat_id, isNewChat, img_64, img_id , model ,  lora_name , genpic_num , webui_style_model_name} = req.body;
  const authHeader = req.headers.authorization;
  let tunnel = "NEW";
  if (!conversationHistory || !Array.isArray(conversationHistory)) {
    return res.status(400).json({ success: false, message: '缺少對話歷史' });
  }

  // 提前處理 userId
  let userId = null;
  if (!isVisitor && authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (error) {
      //console.error('Token 驗證失敗:', error);
      debug('Token 驗證失敗:', error);
    }
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

    if (model == "sd15" || model == "sd21" || model == "sdxl") { tunnel = "OLD"; }
    else if (model == "sd35" || model == "sd35-m" || model == "sd35-l") { tunnel = "NEW"; }

    
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
              images // 直接傳遞 base64 字串陣列
            };
          } catch (error) {
            //console.error('圖片處理錯誤:', error);
            debug('圖片處理錯誤:', error);
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
      keep_alive: "30m",
      stream: true
    };

    //console.log('Ollama Request:', JSON.stringify(ollamaRequest, null, 2));
    debug('Ollama Request:', JSON.stringify(ollamaRequest, null, 2));
    // 準備 assistant 訊息
    let assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    // 收集完整回應
    let fullResponse = '';
    let iterator = await ollama.chat(ollamaRequest);
    
    for await (const chunk of iterator) {
      const chunkContent = chunk.message?.content ?? '';
      fullResponse += chunkContent;
      assistantMessage.content += chunkContent;
      res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
    }
    
    // 只保留一次儲存對話的邏輯 - 讀取用戶問題之前進行儲存
    if (!isVisitor) {
      try {
        let chatDoc;
        if (isNewChat) {
          const cleanUserMessage = {
            ...userMessage,
            images: undefined // 不儲存 base64 圖片
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

          // 添加新的對話記錄，但只保存 img_id
          const cleanUserMessage = {
            ...userMessage,
            images: undefined // 不儲存 base64 圖片
          };
          chatDoc.chat_history.push(cleanUserMessage);
        }
        
        // 添加 AI 回應
        chatDoc.chat_history.push({
          ...assistantMessage,
          content: fullResponse
        });
        
        chatDoc.updated_at = new Date();
        await chatDoc.save();
        
        debug('對話已儲存:', chatDoc);
      } catch (dbErr) {
        debug('儲存對話失敗:', dbErr);
        res.write(`data: ${JSON.stringify({ error: '儲存對話失敗' })}\n\n`);
      }
    }

    // 讀取用戶最後一條訊息並檢查是否要生成圖片
    let question = conversationHistory
      .slice()
      .reverse()
      .find(msg => msg.role === 'user')?.content || '';

    //檢查用戶是否要生成圖片
    if(question.includes("生成") || question.toUpperCase().includes("GENERATE") || 
       question.includes("畫") || question.toUpperCase().includes("DRAW") ||
       question.includes("繪製") || question.toUpperCase().includes("DRAWING") )
    { 
      // 還原圖片生成邏輯
      debug("進入要求生成圖片邏輯處理");
      
      // 檢查用戶是否想要生成心智圖
      if (question.includes("心智圖") || question.includes("腦圖") || 
          question.toUpperCase().includes("MIND MAP") || question.toUpperCase().includes("MINDMAP")) {
        debug("要求生成心智圖");
        try {
          // 生成心智圖
          const graphResult = await generateGraphInternal(question, userId, chat_id, "MINDMAP" );
          res.write(`data: ${JSON.stringify({ 
            type: 'graph',
            content: graphResult
          })}\n\n`);
        } catch (graphErr) {
          debug("心智圖生成錯誤:", graphErr);
          res.write(`data: ${JSON.stringify({ error: '心智圖生成失敗' })}\n\n`);
        }
      }
      // 檢查用戶是否想要生成 SCD 圖
      else if (question.includes("系統上下文圖") || question.toUpperCase().includes("SCD") || 
               question.includes("系統情境圖") || question.toUpperCase().includes("SYSTEM CONTEXT DIAGRAM")) {
        debug("要求生成系統上下文圖");
        try {
          // 生成 SCD 圖
          const graphResult = await generateGraphInternal(question, userId, chat_id, "SCD");
          res.write(`data: ${JSON.stringify({ 
            type: 'graph',
            content: graphResult
          })}\n\n`);
        } catch (graphErr) {
          debug("系統上下文圖生成錯誤:", graphErr);
          res.write(`data: ${JSON.stringify({ error: '系統上下文圖生成失敗' })}\n\n`);
        }
      }
      // 處理一般圖片生成請求
      else {
        debug("其他圖片");
        try {
          // 判斷是否要使用 Stable Diffusion 3.5 模型
          if (tunnel.toUpperCase() == "NEW") {
            const imageResult = await generateGraphInternal(question, userId, chat_id, "OTHER", tunnel, model, lora_name, genpic_num, webui_style_model_name);
            
            // 處理單圖片結果
            if (imageResult && imageResult.imageId) {
              try {
                // 獲取圖片 base64 數據
                const imageData = await getImageAsBase64(imageResult.imageId);
                
                // 發送單張圖片資訊到前端
                res.write(`data: ${JSON.stringify({
                  type: 'image',
                  fileId: imageResult.imageId,
                  url: imageResult.url,
                  image: {
                    fileId: imageResult.imageId,
                    filename: `AI生成圖片 (${model})`,
                    base64: imageData.base64
                  }
                })}\n\n`);
                
                // 將單張圖片 ID 添加到資料庫
                if (!isVisitor && userId) {
                  await addImageIdToChat(userId, chat_id, imageResult.imageId);
                }
              } catch (error) {
                debug('獲取單張圖片 base64 失敗:', error);
                res.write(`data: ${JSON.stringify({
                  type: 'image',
                  fileId: imageResult.imageId,
                  url: imageResult.url
                })}\n\n`);
              }
            } 
            // 處理多圖片結果
            else if (imageResult && imageResult.multipleImages && imageResult.imageIds) {
              // 逐一處理每張圖片
              for (let i = 0; i < imageResult.imageIds.length; i++) {
                const imageId = imageResult.imageIds[i];
                try {
                  // 獲取圖片 base64 數據
                  const imageData = await getImageAsBase64(imageId);
                  
                  // 發送每張圖片的資訊到前端
                  res.write(`data: ${JSON.stringify({
                    type: 'image',
                    multipleImages: true,
                    index: i + 1,
                    total: imageResult.imageIds.length,
                    fileId: imageId,
                    url: imageResult.urls[i],
                    image: {
                      fileId: imageId,
                      filename: `AI生成圖片 ${i+1}/${imageResult.imageIds.length} (${model})`,
                      base64: imageData.base64
                    }
                  })}\n\n`);
                } catch (error) {
                  debug(`獲取第 ${i+1} 張圖片 base64 失敗:`, error);
                  res.write(`data: ${JSON.stringify({
                    type: 'image',
                    multipleImages: true,
                    index: i + 1,
                    total: imageResult.imageIds.length,
                    fileId: imageId,
                    url: imageResult.urls[i]
                  })}\n\n`);
                }
              }
              
              // 將所有圖片 ID 添加到資料庫
              if (!isVisitor && userId) {
                await addImageIdToChat(userId, chat_id, imageResult.imageIds);
              }
            }
          } 
          // 其他模型也需要做相似處理...

        } catch (imageErr) {
          debug("圖片生成錯誤:", imageErr);
          res.write(`data: ${JSON.stringify({ error: '圖片生成失敗' })}\n\n`);
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    debug('聊天錯誤:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }


};

exports.getChatHistories = async (req, res) => {
  //console.log('getChatHistories called');
  //console.log('Headers:', req.headers);  // 檢查所有 headers
  debug('getChatHistories called');
  debug('Headers:', req.headers);  // 檢查所有 headers

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    //console.log('No authorization header found');
    debug('No authorization header found');
    return res.status(401).json({ success: false, message: '未提供認證' });
  }

  const token = authHeader.split(' ')[1];
  //console.log('Extracted token:', token);
  debug('Extracted token:', token);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    //console.log('Decoded token:', decoded);
    debug('Decoded token:', decoded);

    const histories = await Chat.find(
      { userId: decoded.id },
      { chat_id: 1, title: 1, updated_at: 1 }
    ).sort({ updated_at: -1 });
    
    //console.log('Found histories:', histories);
    debug('Found histories:', histories);
    res.json({ success: true, histories });
    
  } catch (err) {
    //console.error('Error in getChatHistories:', err);
    debug('Error in getChatHistories:', err);
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
    
    // 明確指定要返回 graph_json 字段
    const chat = await Chat.findOne(
      {
        userId: decoded.id,
        chat_id: req.params.chatId
      },
      {
        'chat_history.role': 1,
        'chat_history.content': 1,
        'chat_history.img_id': 1,
        'chat_history.graph_json': 1, // 確保包含 graph_json
        'chat_history.timestamp': 1
      }
    );
    
    if (!chat) {
      return res.status(404).json({ success: false, message: '對話不存在' });
    }

    // 檢查和轉換 graph_json（如果是字符串則解析為 JSON）
    const formattedHistory = chat.chat_history.map(msg => {
      const formattedMsg = {
        role: msg.role,
        content: msg.content,
        img_id: msg.img_id || []
      };

      if (msg.graph_json) {
        try {
          formattedMsg.graph_json = typeof msg.graph_json === 'string' 
            ? JSON.parse(msg.graph_json) 
            : msg.graph_json;
        } catch (e) {
          //console.error('graph_json 解析錯誤:', e);
          debug('graph_json 解析錯誤:', e);
        }
      }

      return formattedMsg;
    });
    
    res.json({ success: true, chat_history: formattedHistory });
  } catch (err) {
    //console.error('載入對話失敗:', err);
    debug('載入對話失敗:', err);
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
        //console.error('Multer error:', err);
        debug('Multer error:', err);
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
        //console.error('GridFS error:', gridfsErr);
        debug('GridFS error:', gridfsErr);
        res.status(500).json({ success: false, message: '圖片儲存失敗' });
      }
    });
  } catch (err) {
    //console.error('General error:', err);
    debug('General error:', err);
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
      //console.log('圖片已存在於本地:', localPath);
      debug('圖片已存在於本地:', localPath);
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
        //console.error('下載錯誤:', error);
        debug('下載錯誤:', error);
        res.status(500).json({ 
          success: false, 
          message: '圖片下載失敗' 
        });
      })
      .on('finish', () => {
        //console.log('圖片已下載至:', localPath);
        debug('圖片已下載至:', localPath);
        res.json({
          success: true,
          path: localPath,
          filename: file.filename
        });
      });

  } catch (err) {
    //console.error('取得圖片位置錯誤:', err);
    debug('取得圖片位置錯誤:', err);
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
    //console.error('刪除圖片錯誤:', err);
    debug('刪除圖片錯誤:', err);
    res.status(500).json({ 
      success: false, 
      message: '刪除圖片失敗' 
    });
  }
};

// 將 upload 中間件導出
exports.upload = upload;

// 刪除特定對話
exports.deleteChat = async (req, res) => {
  try {
    // 驗證用戶是否已登入
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '請先登入' });
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    const chatId = req.params.chatId;

    // 檢查對話是否存在且屬於該用戶
    const chat = await Chat.findOne({
      userId: userId,
      chat_id: chatId
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: '找不到對話或無權限刪除此對話'
      });
    }

    // 刪除對話
    await Chat.deleteOne({ userId, chat_id: chatId });

    // 回傳成功訊息
    res.json({
      success: true,
      message: '對話已成功刪除'
    });

  } catch (err) {
    //console.error('刪除對話錯誤:', err);
    debug('刪除對話錯誤:', err);

    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, message: '無效的認證token' });
    }
    
    res.status(500).json({
      success: false,
      message: '刪除對話失敗'
    });
  }
};

// 添加一個新的工具函數，用於從 GridFS 獲取圖片並轉為 base64
async function getImageAsBase64(imageId) {
  try {
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'images'
    });
    
    const fileId = new ObjectId(imageId);
    
    // 檢查圖片是否存在
    const file = await mongoose.connection.db
      .collection('images.files')
      .findOne({ _id: fileId });
    
    if (!file) {
      throw new Error('找不到圖片');
    }
    
    const chunks = [];
    const downloadStream = bucket.openDownloadStream(fileId);
    
    for await (const chunk of downloadStream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    return {
      base64: buffer.toString('base64'),
      contentType: file.metadata?.contentType || 'image/png',
      filename: file.filename || 'generated-image.png'
    };
  } catch (error) {
    debug('獲取圖片 base64 失敗:', error);
    throw error;
  }
}

// 新增：將圖片 ID 添加到對話記錄的輔助函數
async function addImageIdToChat(userId, chat_id, imageId) {
  try {
    const chatDoc = await Chat.findOne({ chat_id, userId });
    if (chatDoc && chatDoc.chat_history.length > 0) {
      // 找到最後一條助手回應
      const lastAssistantMsgIndex = chatDoc.chat_history.findIndex(
        msg => msg.role === 'assistant' && !msg.img_id && !msg.graph_json
      );
      
      if (lastAssistantMsgIndex !== -1) {
        // 如果找到助手回應，添加圖片 ID
        if (!chatDoc.chat_history[lastAssistantMsgIndex].img_id) {
          chatDoc.chat_history[lastAssistantMsgIndex].img_id = [];
        }
        
        // 處理單一ID或ID陣列
        if (Array.isArray(imageId)) {
          chatDoc.chat_history[lastAssistantMsgIndex].img_id.push(...imageId);
          debug('已將多張圖片 ID 添加到對話記錄中:', imageId);
        } else {
          chatDoc.chat_history[lastAssistantMsgIndex].img_id.push(imageId);
          debug('已將圖片 ID 添加到對話記錄中:', imageId);
        }
        await chatDoc.save();
      } else {
        // 如果找不到助手回應，創建一個新的回應
        chatDoc.chat_history.push({
          role: 'assistant',
          content: '生成圖片',
          img_id: Array.isArray(imageId) ? imageId : [imageId],
          timestamp: new Date()
        });
        await chatDoc.save();
        debug('已創建新的助手回應並添加圖片 ID');
      }
    }
  } catch (dbErr) {
    debug('將圖片 ID 添加到對話記錄失敗:', dbErr);
  }
}