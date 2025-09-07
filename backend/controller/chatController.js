const axios = require('axios');
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
const debug = require('debug')('app:chatController'); // 引入 debug 並設定命名空間

// 在文件頂部添加 API_BASE_URL 常量
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// 引入 child_process 來運行 Python 腳本
const { spawn } = require('child_process');
const { head } = require('../routes/api');

// 修改 spawn_1 函數
const spawn_1 = async function(prompt, userId, chat_id, lora_name, num_images, model_arg, webui_style_model_name) {


  // 確保 num_images 是有效的數字
  num_images = num_images ? parseInt(num_images) : 1;
  
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../stable-diffusion/diffusion_1.5.py');
    const pythonExecutable = path.join(__dirname, '../stable-diffusion/.graphenv/Scripts/python.exe');
    
    debug(`執行 Python 腳本(OLD): ${scriptPath}`);
    debug(`使用 Python 路徑: ${pythonExecutable}`);
    debug(`參數: prompt="${prompt.substring(0, 50)}...", userId=${userId}, chat_id=${chat_id}, lora_name=${lora_name}, num_images=${num_images}, model_arg=${model_arg}, webui_style=${webui_style_model_name}`);

    // 添加環境變數設定
    const args = [scriptPath, prompt, userId, chat_id, lora_name, num_images];
    if (webui_style_model_name) {
      console.log("使用 webui_style_model_name:", webui_style_model_name);
      args.push(webui_style_model_name);
    } else {
      console.log("未提供 webui_style_model_name，使用默認值:", model_arg);
      args.push(model_arg);
    }

    const pythonProcess = spawn(
      pythonExecutable,
      args,
      {
        env: { 
          ...process.env,
          PYTHONPATH: path.join(__dirname, '../stable-diffusion/.graphenv/Lib/site-packages'),
          VIRTUAL_ENV: path.join(__dirname, '../stable-diffusion/.graphenv')
        }
      }
    );


    let stdoutData = "";
    let stderrData = "";

    // 收集標準輸出
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      debug(`[Info]Python 標準輸出: ${data.toString().trim()}`);
    });
 
    // 收集錯誤輸出
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      debug(`[Warm]Python 輸出: ${data.toString().trim()}`);
    });

    pythonProcess.on('error', (error) => {
      debug(`[Error]無法啟動 Python 進程: ${error.message}`);
      reject(new Error(`無法啟動 Python 進程: ${error.message}`));
    });

    // 腳本執行完畢後處理結果
    pythonProcess.on('exit', (code) => {
      if (code !== 0) {
        debug(`[Error]Python 腳本執行失敗 (退出碼 ${code}): ${stderrData}`);
        reject(new Error(`圖片生成失敗: ${stderrData}`));
        return;
      }
      
      try {
        debug('[Info]Python 輸出原始內容:', stdoutData);
        
        // 先尋找多圖片格式 {"_ids": [...]} 的 JSON 字串
        const idsJsonRegex = /\{\s*"_ids"\s*:\s*\[\s*"[^"]+(?:",\s*"[^"]+)*"\s*\]\s*\}/g;
        const idsMatch = stdoutData.match(idsJsonRegex);
        
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
        const idMatch = stdoutData.match(idJsonRegex);
        
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
        const lastOpenBrace = stdoutData.lastIndexOf('{');
        const lastCloseBrace = stdoutData.lastIndexOf('}');
        
        if (lastOpenBrace !== -1 && lastCloseBrace !== -1 && lastOpenBrace < lastCloseBrace) {
          try {
            const jsonCandidate = stdoutData.substring(lastOpenBrace, lastCloseBrace + 1);
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
        const idsMatch2 = stdoutData.match(idsPattern);
        
        if (idsMatch2 && idsMatch2[1]) {
          const fileIds = idsMatch2[1].split('","').map(id => id.trim());
          debug('從輸出中提取的檔案 IDs:', fileIds);
          resolve({ _ids: fileIds });
          return;
        }
        
        const idPattern = /"_id"\s*:\s*"([^"]+)"/;
        const idMatch2 = stdoutData.match(idPattern);
        
        if (idMatch2 && idMatch2[1]) {
          const fileId = idMatch2[1];
          debug('從輸出中提取的檔案 ID:', fileId);
          resolve({ _id: fileId });
          return;
        }
        
        debug('無法在輸出中找到有效的 JSON 對象或檔案 ID');
        reject(new Error('無法在 Python 輸出中找到有效的 JSON 對象'));
        
      } catch (err) {
        debug('無法解析 Python 輸出:', stdoutData);
        debug('解析錯誤:', err);
        reject(new Error(`解析圖片生成結果失敗: ${err.message}`));
      }
    });
  });
};

// 修改 spawn_3 函數
const spawn_3 = async function(prompt, userId, chat_id, lora_name, num_images, model_arg, webui_style_model_name) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../stable-diffusion/diffusion_3.5.py');
    const pythonExecutable = path.join(__dirname, '../stable-diffusion/.graphenv/Scripts/python.exe');
    console.log("webui_style_model_name:", webui_style_model_name);
    debug(`執行 Python 腳本: ${scriptPath}`);
    debug(`使用 Python 路徑: ${pythonExecutable}`);
    debug(`參數: prompt="${prompt.substring(0, 50)}...", userId=${userId}, chat_id=${chat_id}, lora_name=${lora_name}, num_images=${num_images}, model_arg=${model_arg}`);

    const args = [scriptPath, prompt, userId, chat_id, lora_name, num_images];
    if (webui_style_model_name) {
      console.log("使用 webui_style_model_name:", webui_style_model_name);
      args.push(webui_style_model_name);
    } else {
      console.log("未提供 webui_style_model_name，使用默認值:", model_arg);
      args.push(model_arg);
    }

    // 添加環境變數設定
    const pythonProcess = spawn(
      pythonExecutable,
      args,
      {
        env: { 
          ...process.env,
          PYTHONPATH: path.join(__dirname, '../stable-diffusion/.graphenv/Lib/site-packages'),
          VIRTUAL_ENV: path.join(__dirname, '../stable-diffusion/.graphenv')
        }
      }
    );

    let stdoutData = "";
    let stderrData = "";

    // 收集標準輸出
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      debug(`[Info]Python 標準輸出: ${data.toString().trim()}`);
    });
 
    // 收集錯誤輸出
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      debug(`[Warm]Python 輸出: ${data.toString().trim()}`);
    });

    pythonProcess.on('error', (error) => {
      debug(`[Error]無法啟動 Python 進程: ${error.message}`);
      reject(new Error(`無法啟動 Python 進程: ${error.message}`));
    });

    // 腳本執行完畢後處理結果
    pythonProcess.on('exit', (code) => {
      if (code !== 0) {
        debug(`[Error]Python 腳本執行失敗 (退出碼 ${code}): ${stderrData}`);
        reject(new Error(`圖片生成失敗: ${stderrData}`));
        return;
      }
      
      try {
        debug('[Info]Python 輸出原始內容:', stdoutData);
        
        // 先尋找多圖片格式 {"_ids": [...]} 的 JSON 字串
        const idsJsonRegex = /\{\s*"_ids"\s*:\s*\[\s*"[^"]+(?:",\s*"[^"]+)*"\s*\]\s*\}/g;
        const idsMatch = stdoutData.match(idsJsonRegex);
        
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
        const idMatch = stdoutData.match(idJsonRegex);
        
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
        const lastOpenBrace = stdoutData.lastIndexOf('{');
        const lastCloseBrace = stdoutData.lastIndexOf('}');
        
        if (lastOpenBrace !== -1 && lastCloseBrace !== -1 && lastOpenBrace < lastCloseBrace) {
          try {
            const jsonCandidate = stdoutData.substring(lastOpenBrace, lastCloseBrace + 1);
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
        const idsMatch2 = stdoutData.match(idsPattern);
        
        if (idsMatch2 && idsMatch2[1]) {
          const fileIds = idsMatch2[1].split('","').map(id => id.trim());
          debug('從輸出中提取的檔案 IDs:', fileIds);
          resolve({ _ids: fileIds });
          return;
        }
        
        const idPattern = /"_id"\s*:\s*"([^"]+)"/;
        const idMatch2 = stdoutData.match(idPattern);
        
        if (idMatch2 && idMatch2[1]) {
          const fileId = idMatch2[1];
          debug('從輸出中提取的檔案 ID:', fileId);
          resolve({ _id: fileId });
          return;
        }
        
        debug('無法在輸出中找到有效的 JSON 對象或檔案 ID');
        reject(new Error('無法在 Python 輸出中找到有效的 JSON 對象'));
        
      } catch (err) {
        debug('無法解析 Python 輸出:', stdoutData);
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

// 配置 multer 存儲 - 用於 LoRA 檔案
const loraStorage = multer.memoryStorage();
const uploadLora = multer({ 
  storage: loraStorage,
  limits: {
    fileSize: 15 * 1024 * 1024 * 1024, // 15GB 限制
  },
  fileFilter: (req, file, cb) => {
    // 如果提供了 filePath 參數，則不需要實際檔案
    if (req.body && req.body.filePath) {
      cb(null, true);
      return;
    }
    
    // 檢查檔案類型
    if (file.fieldname === 'loraFile') {
      // LoRA 檔案必須是指定格式
      if (file.originalname.endsWith('.safetensors') || 
          file.originalname.endsWith('.ckpt') || 
          file.originalname.endsWith('.pt') ||
          file.originalname.endsWith('.zip')) {
        cb(null, true);
      } else {
        cb(new Error('LoRA 檔案必須是 .safetensors, .ckpt, .pt 或 .zip 格式'));
      }
    } 
    else if (file.fieldname === 'loraImage') {
      // 圖片檔案必須是圖片格式
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('圖片檔案必須是有效的圖片格式'));
      }
    } 
    else {
      cb(new Error('未知的欄位名稱'));
    }
  }
}).fields([
  { name: 'loraFile', maxCount: 1 },  // LoRA 檔案
  { name: 'loraImage', maxCount: 1 }  // LoRA 圖片
]);

// 配置 multer 存儲 - 用於模型檔案
const modelStorage = multer.memoryStorage();
const uploadModel = multer({ 
  storage: modelStorage,
  limits: {
    fileSize: 30 * 1024 * 1024 * 1024, // 30GB 限制
  },
  fileFilter: (req, file, cb) => {
    // 如果提供了 filePath 參數，則不需要實際檔案
    if (req.body && req.body.filePath) {
      cb(null, true);
      return;
    }
    
    // 檢查是否為支援的模型格式或圖片檔案
    if (file && (
        // 支援的模型格式
        file.originalname.endsWith('.safetensors') || 
        file.originalname.endsWith('.ckpt') || 
        file.originalname.endsWith('.bin') ||
        // 支援的圖片格式
        file.mimetype.startsWith('image/')
    )) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳 .safetensors, .ckpt, .bin 或圖片檔案'));
    }
  }
}).fields([
  { name: 'modelFile', maxCount: 1 },  // 模型檔案
  { name: 'modelImage', maxCount: 1 }  // 模型圖片
]); // 使用 fields 允許上傳多種類型的檔案

// 1. 首先添加內部函數 
async function generateGraphInternal(content, userId, chat_id, graph_type, tunnel = "NEW", model = "sd15", lora_name = "", genpic_num = 1, webui_style_model_name = "") {
  let prompt_generate = '';
  
  // 添加詳細日誌來追蹤流程
  debug(`圖片生成開始 - 通道: ${tunnel}, 模型: ${model}, 類型: ${graph_type}`);
  
  if (graph_type.toUpperCase() == "MINDMAP") {
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
    JSON 格式必須包含兩個屬性：  W
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
    if (tunnel.toUpperCase() == "NEW"){
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
        const imageResult = await spawn_3(fullResponse, userId, chat_id , lora_name , genpic_num , webui_style_model_name , webui_style_model_name);
        
        // 檢查生成結果
        if (imageResult && imageResult._id) {
          //console.log(`圖片生成成功 (3.5模型)，ID: ${imageResult._id}`);
          debug(`圖片生成成功 (${model})，ID: ${imageResult._id}`);

          await addImageIdToChat(userId, chat_id, imageResult._id || imageResult._ids);
          return {
            success: true,
            imageId: imageResult._id,
            url: `${API_BASE_URL}/api/images/${imageResult._id}`,
            model: model  // 添加模型資訊，方便前端區分
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
    else if (tunnel.toUpperCase() == "OLD") 
    {
      console.log("進入tunnel old條件式");
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
          lora_name || "", // 將 null 改為空字符串
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
  console.log("loraid: ", lora_name , "modelid" , webui_style_model_name);
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
    else if (model == "sd3-m" || model == "sd35-m" || model == "sd35-l") { tunnel = "NEW"; }
    console.log(`使用的模型: ${model}, 隧道: ${tunnel}`);
    
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
            
            // 處理NEW通道的結果...
          } 
          // 添加 OLD 通道的處理邏輯
          else if (tunnel.toUpperCase() == "OLD") {
            debug("開始處理OLD通道請求");
            const fullResponse = await ollama.chat({
              model: 'llama3.2-vision:11b',
              messages: [
                {
                  role: 'user',
                  content: `請根據以下使用者描述的內容，完善並擴展描述細節，並且回傳英文回復且不能超過256個Token
                  描述：${question}`
                }
              ],
              stream: false
            }).then(response => response.message.content);
            
            debug(`生成圖片的優化提示: ${fullResponse}`);
            
            // 使用 spawn_1 生成圖片
            try {
              // 註意: 傳遞空字串而非 null
              const imageResult = await spawn_1(
                fullResponse, 
                userId, 
                chat_id, 
                lora_name || "", 
                genpic_num ? parseInt(genpic_num) : 1, 
                model || "",
                webui_style_model_name || ""
              );
              
              debug("spawn_1 返回結果:", imageResult);
              
              // 處理單圖片情況
              if (imageResult && imageResult._id) {
                debug(`單圖生成成功，ID: ${imageResult._id}`);
                
                // 修改 OLD 通道的圖片回傳結構
                if (imageResult && imageResult._id) {
                  debug(`單圖生成成功，ID: ${imageResult._id}`);
                  
                  try {
                    // 獲取圖片 base64 數據
                    const imageData = await getImageAsBase64(imageResult._id);
                    
                    // 發送完整的圖片資訊到前端，包含 image 物件
                    res.write(`data: ${JSON.stringify({
                      type: 'image',
                      fileId: imageResult._id,
                      url: `${API_BASE_URL}/api/images/${imageResult._id}`,
                      image: {
                        fileId: imageResult._id,
                        filename: `AI生成圖片 (${model})`,
                        base64: imageData.base64
                      }
                    })}\n\n`);
                  } catch (error) {
                    debug('獲取圖片 base64 失敗:', error);
                    
                    // 失敗時仍發送基本資訊
                    res.write(`data: ${JSON.stringify({
                      type: 'image',
                      fileId: imageResult._id,
                      url: `${API_BASE_URL}/api/images/${imageResult._id}`
                    })}\n\n`);
                  }
                  
                  // 將圖片ID添加到對話記錄中
                  if (!isVisitor && userId) {
                    await addImageIdToChat(userId, chat_id, imageResult._id);
                  }
                }
              }
              // 處理多圖片情況
              else if (imageResult && imageResult._ids) {
                // 確保 _ids 是標準陣列
                let imageIds = Array.isArray(imageResult._ids) ? 
                  imageResult._ids : 
                  Object.values(imageResult._ids);
                  
                debug(`多圖生成成功，共 ${imageIds.length} 張`);
                
                for (let i = 0; i < imageIds.length; i++) {
                  const imageId = imageIds[i];
                  res.write(`data: ${JSON.stringify({
                    type: 'image',
                    multipleImages: true,
                    index: i + 1,
                    total: imageIds.length,
                    fileId: imageId,
                    url: `${API_BASE_URL}/api/images/${imageId}`
                  })}\n\n`);
                }
                
                // 將所有圖片ID添加到對話記錄中，使用標準陣列
                if (!isVisitor && userId) {
                  await addImageIdToChat(userId, chat_id, imageIds);
                }
              }
            } catch (error) {
              debug('OLD 通道圖片生成錯誤:', error);
              res.write(`data: ${JSON.stringify({ error: 'OLD通道圖片生成失敗' })}\n\n`);
            }
          }
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

// 上傳 LoRA 檔案
exports.uploadLora = async (req, res) => {
  try {
    // 驗證用戶是否已登入
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '請先登入' });
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // 使用 Promise 包裝 multer 上傳過程，以便更好地處理錯誤
    const handleUpload = () => {
      return new Promise((resolve, reject) => {
        uploadLora(req, res, function(err) {
          if (err) {
            debug('Multer error (LoRA):', err);
            reject(err);
            return;
          }
          resolve();
        });
      });
    };

    try {
      // 等待上傳完成
      await handleUpload();
      
      let urlLoraData = '';
      let targeturl = '';
      let loraImageIds = []; // 用於儲存下載的圖片ID
      let loraBuffer = null; // 用於儲存從URL下載的LoRA檔案
      let loraFilename = ''; // 用於儲存從URL下載的LoRA檔案名稱
      let extractedFiles = []; // 用於儲存解壓縮後的檔案
      
      // 檢查上傳內容
      if (!req.files?.loraFile && !req.body.filePath) {
        return res.status(400).json({ success: false, message: '未提供 LoRA 檔案' });
      }
      
      // 處理從 Civitai 下載 LoRA 檔案 (現有邏輯保持不變)
      try {
        if (req.body.filePath) {
          const filePath = req.body.filePath;
          const fileurl = new URL(filePath);
          let loraVersionId = fileurl.searchParams.get('modelVersionId');
          
          if (!loraVersionId) {
            const target = fileurl.pathname.match(/models\/(\d+)/);
            if(target){
              const targetid = target[1];
              targeturl = await axios.get('https://civitai.com/api/v1/models/'+ targetid);
              loraVersionId = targeturl.data.modelVersions?.[0]?.id
            }
          }

          debug('LoRA 檔案資訊取得中: https://civitai.com/api/v1/model-versions/' + loraVersionId);
          urlLoraData = await axios.get('https://civitai.com/api/v1/model-versions/' + loraVersionId);
          debug('LoRA 資訊獲取成功，包含圖片數量:', urlLoraData.data.images?.length || 0);
          
          // 檢查是否有 downloadUrl 參數
          if (urlLoraData.data.downloadUrl) {
            debug('發現 LoRA 下載連結:', urlLoraData.data.downloadUrl);
            
            try {
              // 下載 LoRA 檔案
              debug('開始下載 LoRA 檔案...');
              const loraResponse = await axios({
                method: 'get',
                url: urlLoraData.data.downloadUrl,
                responseType: 'arraybuffer',
                headers: {
                  'Accept': 'application/octet-stream'
                },
                // 增加超時時間
                timeout: 1800000 // 30分鐘
              });
              
              // 從 URL 或 Content-Disposition 中提取檔名
              let filename = '';
              const contentDisposition = loraResponse.headers['content-disposition'];
              if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                  filename = filenameMatch[1];
                }
              }
              
              if (!filename) {
                const urlObj = new URL(urlLoraData.data.downloadUrl);
                filename = path.basename(urlObj.pathname) || 'downloaded_lora.safetensors';
              }
              
              loraBuffer = Buffer.from(loraResponse.data);
              loraFilename = filename;
              
              debug(`LoRA 檔案下載成功: ${filename}, 大小: ${(loraBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
              
              // 檢查是否為 ZIP 檔案
              if (loraFilename.toLowerCase().endsWith('.zip')) {
                debug('檢測到 ZIP 檔案，開始解壓縮...');
                
                // 需要先安裝 adm-zip: npm install adm-zip
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(loraBuffer);
                const zipEntries = zip.getEntries();
                
                // 過濾出所有 safetensors, pt, ckpt 檔案
                const validEntries = zipEntries.filter(entry => {
                  const entryName = entry.entryName.toLowerCase();
                  return !entry.isDirectory && (
                    entryName.endsWith('.safetensors') || 
                    entryName.endsWith('.pt') || 
                    entryName.endsWith('.ckpt')
                  );
                });
                
                if (validEntries.length === 0) {
                  return res.status(400).json({ 
                    success: false, 
                    message: 'ZIP 檔案中沒有找到有效的 LoRA 模型檔案' 
                  });
                }
                
                // 提取所有有效檔案
                for (const entry of validEntries) {
                  const entryBuffer = entry.getData();
                  extractedFiles.push({
                    filename: entry.entryName,
                    buffer: entryBuffer
                  });
                }
                
                debug(`從 ZIP 檔案中提取了 ${extractedFiles.length} 個有效的 LoRA 模型檔案`);
              }
            } catch (downloadErr) {
              debug('LoRA 檔案下載失敗:', downloadErr);
              return res.status(500).json({ 
                success: false, 
                message: 'LoRA 檔案下載失敗: ' + (downloadErr.message || '未知錯誤') 
              });
            }
          } else {
            debug('API 回傳中沒有找到 downloadUrl 參數');
          }
          
          // 如果存在 LoRA 圖片，下載並儲存到 GridFS
          if (urlLoraData.data.images && urlLoraData.data.images.length > 0) {
            debug('開始下載 LoRA 圖片...');
            
            // 建立 GridFS bucket 用於圖片檔案
            const imageBucket = new GridFSBucket(mongoose.connection.db, {
              bucketName: 'images'
            });
            
            // 最多下載前3張圖片
            const imagesToDownload = urlLoraData.data.images.slice(0, 3);
            
            // 並行下載圖片
            const downloadPromises = imagesToDownload.map(async (image, index) => {
              try {
                debug(`下載第 ${index + 1} 張圖片: ${image.url}`);
                
                // 下載圖片
                const imageResponse = await axios({
                  method: 'get',
                  url: image.url,
                  responseType: 'arraybuffer'
                });
                
                // 從URL中提取檔名
                const imageUrl = new URL(image.url);
                const imageFilename = path.basename(imageUrl.pathname) || `lora_image_${index}.jpg`;
                
                // 上傳到 GridFS
                const imageBuffer = Buffer.from(imageResponse.data);
                const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
                
                const imageUploadStream = imageBucket.openUploadStream(imageFilename, {
                  metadata: {
                    userId: decoded.id,
                    contentType: contentType,
                    uploadDate: new Date(),
                    fileType: 'loraImage',
                    loraName: urlLoraData.data.model?.name || 'unknown',
                    width: image.width || 0,
                    height: image.height || 0,
                    nsfw: image.nsfw || false,
                    source: 'civitai'
                  }
                });
                
                // 等待上傳完成
                const imageId = await new Promise((resolve, reject) => {
                  imageUploadStream.on('finish', () => {
                    resolve(imageUploadStream.id.toString());
                  });
                  imageUploadStream.on('error', reject);
                  imageUploadStream.end(imageBuffer);
                });
                
                debug(`圖片 ${index + 1} 上傳成功，ID: ${imageId}`);
                return imageId;
              } catch (downloadErr) {
                debug(`圖片 ${index + 1} 下載或上傳失敗:`, downloadErr);
                return null; // 返回 null 表示此圖片處理失敗
              }
            });
            
            // 等待所有圖片下載完成
            const downloadedImageIds = await Promise.all(downloadPromises);
            loraImageIds = downloadedImageIds.filter(id => id !== null); // 過濾掉失敗的下載
            
            debug(`成功下載並上傳 ${loraImageIds.length} 張 LoRA 圖片`);
          }
        }
      } catch (err) {
        debug('LoRA 資訊或圖片下載錯誤:', err);
        // 繼續處理，不中斷上傳流程
      }

      // 處理用戶自行上傳的 LoRA 圖片
      let userUploadedImageId = '';
      if (req.files?.loraImage && req.files.loraImage.length > 0) {
        try {
          // 建立 GridFS bucket 用於圖片檔案
          const imageBucket = new GridFSBucket(mongoose.connection.db, {
            bucketName: 'images'
          });
          
          const imageFile = req.files.loraImage[0];
          
          // 上傳圖片
          const imageUploadStream = imageBucket.openUploadStream(imageFile.originalname, {
            metadata: {
              userId: decoded.id,
              contentType: imageFile.mimetype,
              uploadDate: new Date(),
              fileType: 'loraImage',
              loraName: req.body.loraName || urlLoraData?.data?.model?.name || 'unknown',
              source: 'userUpload'
            }
          });
          
          // 等待圖片上傳完成
          userUploadedImageId = await new Promise((resolve, reject) => {
            imageUploadStream.on('finish', () => {
              resolve(imageUploadStream.id.toString());
            });
            imageUploadStream.on('error', reject);
            imageUploadStream.end(imageFile.buffer);
          });
          
          debug(`用戶上傳的 LoRA 圖片上傳成功，ID: ${userUploadedImageId}`);
          
          // 將用戶上傳的圖片ID放在陣列最前面，作為主要預覽圖
          if (userUploadedImageId) {
            loraImageIds.unshift(userUploadedImageId);
          }
        } catch (imageErr) {
          debug('用戶上傳的 LoRA 圖片處理錯誤:', imageErr);
        }
      }

      try {
        // 建立 GridFS bucket 用於 LoRA 檔案
        const bucket = new GridFSBucket(mongoose.connection.db, {
          bucketName: 'loras'
        });
        
        // 準備上傳的檔案清單
        let loraFiles = [];
        
        if (extractedFiles.length > 0) {
          // 使用從 ZIP 解壓縮的檔案
          loraFiles = extractedFiles;
        } else if (loraBuffer) {
          // 使用從 URL 下載的單一檔案
          loraFiles = [{
            filename: loraFilename,
            buffer: loraBuffer
          }];
        } else if (req.files?.loraFile?.[0]) {
          // 使用用戶上傳的檔案
          const loraFile = req.files.loraFile[0];
          loraFiles = [{
            filename: loraFile.originalname,
            buffer: loraFile.buffer
          }];
        } else {
          return res.status(400).json({ success: false, message: '未提供有效的 LoRA 檔案' });
        }
        
        // 創建存儲 LoRA 檔案的本地目錄
        const loraDir = path.join(__dirname, '../stable-diffusion/loras');
        if (!fs.existsSync(loraDir)) {
          fs.mkdirSync(loraDir, { recursive: true });
        }
        
        // 用於儲存上傳的檔案資訊
        const uploadedLoras = [];
        
        // 處理每個檔案
        for (const loraFile of loraFiles) {
          const originalFilename = loraFile.filename;
          const baseFilename = path.basename(originalFilename, path.extname(originalFilename));
          const fileExtension = path.extname(originalFilename);
          const modelType = req.body.modelType || urlLoraData?.data?.baseModel || 'unknown'; // 例如: sd15, sd21, sdxl, sd35...

          if(urlLoraData?.data?.baseModel){
          const baseModel = urlLoraData.data.baseModel.toUpperCase();
          if(baseModel.includes("SD") && baseModel.includes("1")){
            urlLoraData.data.baseModel = "sd15";
          }
          else if(baseModel.includes("SD") && baseModel.includes("2")){
            urlLoraData.data.baseModel = "sd21";
          }
          else if(baseModel.includes("SD") && baseModel.includes("XL")){
            urlLoraData.data.baseModel = "sdxl";
          }
          else if(baseModel.includes("SD") && baseModel.includes("3") && baseModel.includes("L")){
            urlLoraData.data.baseModel = "sd35-l";
          }
          else if(baseModel.includes("SD") && baseModel.includes("3") && baseModel.includes("M")){
            urlLoraData.data.baseModel = "sd35-m";
          }
          else if(baseModel.includes("SD") && baseModel.includes("3")){
            urlLoraData.data.baseModel = "sd3-m";
          }
          else{
            urlLoraData.data.baseModel = "default";
          }
        }

          // 上傳新檔案到 GridFS
          const uploadStream = bucket.openUploadStream(originalFilename, {
            metadata: {
              userId: decoded.id,
              contentType: 'application/octet-stream',
              uploadDate: new Date(),
              fileType: 'lora',
              modelType: urlLoraData.data.baseModel || 'unknown',
              baseFilename: baseFilename,
              description: req.body.description || urlLoraData?.data?.description || '',
              loraImages: loraImageIds, // 儲存所有圖片ID陣列
              loraMainImage: loraImageIds.length > 0 ? loraImageIds[0] : "unknown", // 第一張圖作為主圖
              fileSize: loraFile.buffer.length,
              prettySize: `${(loraFile.buffer.length / (1024 * 1024)).toFixed(2)} MB`,
              source: loraBuffer ? 'civitai_download' : 'user_upload',
              isExtractedFromZip: extractedFiles.length > 0
            }
          });
          
          // 等待上傳完成
          const fileId = await new Promise((resolve, reject) => {
            uploadStream.on('finish', () => {
              resolve(uploadStream.id.toString());
            });
            uploadStream.on('error', (err) => {
              debug(`GridFS 上傳錯誤: ${err.message}`);
              reject(err);
            });
            uploadStream.end(loraFile.buffer);
          });
          
          // 儲存到本地 loras 目錄
          const localPath = path.join(loraDir, `${baseFilename}${fileExtension}`);
          fs.writeFileSync(localPath, loraFile.buffer);
          debug(`LoRA 檔案已儲存至本地: ${localPath}`);
          
          // 記錄上傳的檔案資訊
          uploadedLoras.push({
            fileId: fileId,
            filename: baseFilename,
            originalFilename: originalFilename,
            size: loraFile.buffer.length,
            prettySize: `${(loraFile.buffer.length / (1024 * 1024)).toFixed(2)} MB`
          });
        }
        
        // 構建回應
        const response = {
          success: true,
          message: `已成功上傳 ${uploadedLoras.length} 個 LoRA 檔案`,
          totalFiles: uploadedLoras.length,
          loras: uploadedLoras
        };
        
        // 如果有圖片，添加圖片資訊
        if (loraImageIds.length > 0) {
          response.loraImageIds = loraImageIds;
          response.loraMainImageId = loraImageIds[0];
          response.loraMainImageUrl = `${API_BASE_URL}/api/images/${loraImageIds[0]}`;
          response.totalImages = loraImageIds.length;
        }
        
        res.json(response);
      } catch (gridfsErr) {
        debug('GridFS error (LoRA):', gridfsErr);
        res.status(500).json({ success: false, message: 'LoRA 檔案儲存失敗' });
      }
    } catch (multerErr) {
      // 處理 multer 上傳錯誤
      debug('Multer error (LoRA):', multerErr);
      return res.status(400).json({ 
        success: false, 
        message: `檔案上傳失敗: ${multerErr.message}` 
      });
    }
  } catch (err) {
    debug('General error (LoRA):', err);
    res.status(500).json({ success: false, message: 'LoRA 檔案上傳失敗' });
  }
};

// 上傳模型檔案
exports.uploadModel = async (req, res) => {
  try {
    // 驗證用戶是否已登入
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '請先登入' });
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
        
    // 使用 Promise 包裝 multer 上傳過程，以便更好地處理錯誤
    const handleUpload = () => {
      return new Promise((resolve, reject) => {
        uploadModel(req, res, function(err) {
          if (err) {
            debug('Multer error (Model):', err);
            reject(err);
            return;
          }
          resolve();
        });
      });
    };
    
    try {
      // 等待上傳完成
      await handleUpload();
    
      let urlmodeldata = '';
      let targeturl = '';
      let modelImageIds = []; // 用於儲存下載的圖片ID
      let modelBuffer = null; // 用於儲存從URL下載的模型檔案
      let modelFilename = ''; // 用於儲存從URL下載的模型檔案名稱
      let extractedFiles = []; // 用於儲存解壓縮後的檔案
      
      // 檢查上傳內容
      if (!req.files?.modelFile && !req.body.filePath) {
        return res.status(400).json({ success: false, message: '未提供模型檔案' });
      }
      
      try {
        // 處理從 Civitai 下載的模型檔案 (現有邏輯保持不變)
        if (req.body.filePath) {
          const filePath = req.body.filePath;
          const fileurl = new URL(filePath);
          let modelVersionId = fileurl.searchParams.get('modelVersionId');

          if (!modelVersionId) {
            const target = fileurl.pathname.match(/models\/(\d+)/);
            if(target){
              const targetid = target[1];
              targeturl = await axios.get('https://civitai.com/api/v1/models/'+ targetid);
              modelVersionId = targeturl.data.modelVersions?.[0]?.id
            }
          }
          debug('模型檔案資訊取得中: https://civitai.com/api/v1/model-versions/' + modelVersionId);
          urlmodeldata = await axios.get('https://civitai.com/api/v1/model-versions/' + modelVersionId);
          debug('模型資訊獲取成功，包含圖片數量:', urlmodeldata.data.images?.length || 0);
          
          // 檢查是否有 downloadUrl 參數
          if (urlmodeldata.data.downloadUrl) {
            debug('發現模型下載連結:', urlmodeldata.data.downloadUrl);
            
            try {
              // 下載模型檔案
              debug('開始下載模型檔案...');
              const modelResponse = await axios({
                method: 'get',
                url: urlmodeldata.data.downloadUrl,
                responseType: 'arraybuffer',
                headers: {
                  'Accept': 'application/octet-stream'
                },
                // 增加超時時間，因為模型檔案可能很大
                timeout: 3600000 // 1小時
              });
              
              // 從 URL 或 Content-Disposition 中提取檔名
              let filename = '';
              const contentDisposition = modelResponse.headers['content-disposition'];
              if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                  filename = filenameMatch[1];
                }
              }
              
              if (!filename) {
                const urlObj = new URL(urlmodeldata.data.downloadUrl);
                filename = path.basename(urlObj.pathname) || 'downloaded_model.safetensors';
                       }
              
              modelBuffer = Buffer.from(modelResponse.data);
              modelFilename = filename;
              
              debug(`模型檔案下載成功: ${filename}, 大小: ${(modelBuffer.length / (1024 * 1024 * 1024)).toFixed(2)} GB`);
              
              // 檢查是否為 ZIP 檔案
              if (modelFilename.toLowerCase().endsWith('.zip')) {
                debug('檢測到 ZIP 檔案，開始解壓縮...');
                
                // 需要先安裝 adm-zip: npm install adm-zip
                const AdmZip = require('adm-zip');
                const zip = new AdmZip(modelBuffer);
                const zipEntries = zip.getEntries();
                
                // 過濾出所有 safetensors, pt, ckpt 檔案
                const validEntries = zipEntries.filter(entry => {
                  const entryName = entry.entryName.toLowerCase();
                  return !entry.isDirectory && (
                    entryName.endsWith('.safetensors') || 
                    entryName.endsWith('.pt') || 
                    entryName.endsWith('.ckpt')
                  );
                });
                
                if (validEntries.length === 0) {
                  return res.status(400).json({ 
                    success: false, 
                    message: 'ZIP 檔案中沒有找到有效的模型檔案' 
                  });
                }
                
                // 提取所有有效檔案
                for (const entry of validEntries) {
                  const entryBuffer = entry.getData();
                  extractedFiles.push({
                    filename: entry.entryName,
                    buffer: entryBuffer
                  });
                }
                
                debug(`從 ZIP 檔案中提取了 ${extractedFiles.length} 個有效的模型檔案`);
              }
            } catch (downloadErr) {
              debug('模型檔案下載失敗:', downloadErr);
              return res.status(500).json({ 
                success: false, 
                message: '模型檔案下載失敗: ' + (downloadErr.message || '未知錯誤') 
              });
            }
          } else {
            debug('API 回傳中沒有找到 downloadUrl 參數');
          }
          
          // 如果存在模型圖片，下載並儲存到 GridFS
          if (urlmodeldata.data.images && urlmodeldata.data.images.length > 0) {
            debug('開始下載模型圖片...');
            
            // 建立 GridFS bucket 用於圖片檔案
            const imageBucket = new GridFSBucket(mongoose.connection.db, {
              bucketName: 'images'
            });
            
            // 最多下載前5張圖片
            const imagesToDownload = urlmodeldata.data.images.slice(0, 5);
            
            // 並行下載圖片
            const downloadPromises = imagesToDownload.map(async (image, index) => {
              try {
                debug(`下載第 ${index + 1} 張圖片: ${image.url}`);
                
                // 下載圖片
                const imageResponse = await axios({
                  method: 'get',
                  url: image.url,
                  responseType: 'arraybuffer'
                });
                
                // 從URL中提取檔名
                const imageUrl = new URL(image.url);
                const imageFilename = path.basename(imageUrl.pathname) || `model_image_${index}.jpg`;
                
                // 上傳到 GridFS
                const imageBuffer = Buffer.from(imageResponse.data);
                const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
                
                const imageUploadStream = imageBucket.openUploadStream(imageFilename, {
                  metadata: {
                    userId: decoded.id,
                    contentType: contentType,
                    uploadDate: new Date(),
                    fileType: 'modelImage',
                    modelName: urlmodeldata.data.model?.name || 'unknown',
                    width: image.width || 0,
                    height: image.height || 0,
                    nsfw: image.nsfw || false,
                    source: 'civitai'
                  }
                });
                
                // 等待上傳完成
                const imageId = await new Promise((resolve, reject) => {
                  imageUploadStream.on('finish', () => {
                    resolve(imageUploadStream.id.toString());
                  });
                  imageUploadStream.on('error', reject);
                  imageUploadStream.end(imageBuffer);
                });
                
                debug(`圖片 ${index + 1} 上傳成功，ID: ${imageId}`);
                return imageId;
              } catch (downloadErr) {
                debug(`圖片 ${index + 1} 下載或上傳失敗:`, downloadErr);
                return null; // 返回 null 表示此圖片處理失敗
              }
            });
            
            // 等待所有圖片下載完成
            const downloadedImageIds = await Promise.all(downloadPromises);
            modelImageIds = downloadedImageIds.filter(id => id !== null); // 過濾掉失敗的下載
            
            debug(`成功下載並上傳 ${modelImageIds.length} 張模型圖片`);
          }
        }
      } catch (err) {
        debug('模型資訊或圖片下載錯誤:', err);
        // 繼續處理，不中斷上傳流程
      }

      // 處理用戶自行上傳的模型圖片
      let userUploadedImageId = '';
      if (req.files?.modelImage && req.files.modelImage.length > 0) {
        try {
          // 建立 GridFS bucket 用於圖片檔案
          const imageBucket = new GridFSBucket(mongoose.connection.db, {
            bucketName: 'images'
          });
          
          const imageFile = req.files.modelImage[0];
          
          // 上傳圖片
          const imageUploadStream = imageBucket.openUploadStream(imageFile.originalname, {
            metadata: {
              userId: decoded.id,
              contentType: imageFile.mimetype,
              uploadDate: new Date(),
              fileType: 'modelImage',
              modelName: req.body.modelName || urlmodeldata?.data?.model?.name || 'unknown',
              source: 'userUpload'
            }
          });
          
          // 等待圖片上傳完成
          userUploadedImageId = await new Promise((resolve, reject) => {
            imageUploadStream.on('finish', () => {
              resolve(imageUploadStream.id.toString());
            });
            imageUploadStream.on('error', reject);
            imageUploadStream.end(imageFile.buffer);
          });
          
          debug(`用戶上傳的模型圖片上傳成功，ID: ${userUploadedImageId}`);
          
          // 將用戶上傳的圖片ID放在陣列最前面，作為主要預覽圖
          if (userUploadedImageId) {
            modelImageIds.unshift(userUploadedImageId);
          }
        } catch (imageErr) {
          debug('用戶上傳的模型圖片處理錯誤:', imageErr);
          // 繼續處理，不因圖片上傳錯誤而中斷整個流程
        }
      }

      try {
        // 建立 GridFS bucket 用於模型檔案
        const bucket = new GridFSBucket(mongoose.connection.db, {
          bucketName: 'models'
        });

        // 確定要使用的模型資料 - 優先使用從 URL 下載的檔案，其次是用戶上傳的檔案
        let modelData, originalFilename, modelSize;
        
        if (modelBuffer) {
          // 使用從 URL 下載的模型檔案
          modelData = modelBuffer;
          originalFilename = modelFilename;
          modelSize = modelBuffer.length;
          debug('使用從 URL 下載的模型檔案');
        } else if (req.files?.modelFile?.[0]) {
          // 使用用戶上傳的模型檔案
          const modelFile = req.files.modelFile[0];
          modelData = modelFile.buffer;
          originalFilename = modelFile.originalname;
          modelSize = modelFile.size;
          debug('使用用戶上傳的模型檔案');
        } else {
          return res.status(400).json({ success: false, message: '未提供有效的模型檔案' });
        }

        if(urlmodeldata?.data?.baseModel){
          const baseModel = urlmodeldata.data.baseModel.toUpperCase();

          if(baseModel.includes("SD") && baseModel.includes("2")){
            urlmodeldata.data.baseModel = "sd21";
          }
          else if(baseModel.includes("SD") && baseModel.includes("XL")){
            urlmodeldata.data.baseModel = "sdxl";
          }
          else if(baseModel.includes("SD") && baseModel.includes("1")){
            urlmodeldata.data.baseModel = "sd15";
          }
          else if(baseModel.includes("SD") && baseModel.includes("3") && baseModel.includes("L")){
            urlmodeldata.data.baseModel = "sd35-l";
          }
          else if(baseModel.includes("SD") && baseModel.includes("3") && baseModel.includes("M")){
            urlmodeldata.data.baseModel = "sd35-m";
          }
          else if(baseModel.includes("SD") && baseModel.includes("3")){
            urlmodeldata.data.baseModel = "sd3-m";
          }
          else{
            urlmodeldata.data.baseModel = "default";
          }
        }
       
        
        const baseFilename = path.basename(originalFilename, path.extname(originalFilename)) || urlmodeldata?.data?.files?.name || 'unknown';
        const modelType = req.body.modelType || urlmodeldata?.data?.baseModel || 'unknown'; // 例如: sd15, sd21, sdxl, sd35...
        const modelName = req.body.modelName || urlmodeldata?.data?.model?.name || 'unknown';
        const modelURL = req.body.filePath || 'unknown';
        const modelVersionId = urlmodeldata?.data?.id || 'unknown';
        
        // 上傳新檔案
        const uploadStream = bucket.openUploadStream(originalFilename, {
          metadata: {
            userId: decoded.id,
            contentType: 'application/octet-stream',
            uploadDate: new Date(),
            fileType: 'model',
            modelType: modelType,
            modelName: modelName,
            baseFilename: baseFilename,
            description: req.body.description || urlmodeldata?.data?.description || '',
            modelImages: modelImageIds, // 儲存所有圖片ID陣列
            modelMainImage: modelImageIds.length > 0 ? modelImageIds[0] : "unknown", // 第一張圖作為主圖
            fileSize: modelSize,
            prettySize: `${(modelSize / (1024 * 1024 * 1024)).toFixed(2)} GB`,
            modelVersionId: modelVersionId,
            modelurl:  modelURL,
            source: modelBuffer ? 'civitai_download' : 'user_upload'
          }
        });

        // 等待上傳完成
        const fileId = await new Promise((resolve, reject) => {
          uploadStream.on('finish', () => {
            resolve(uploadStream.id.toString());
          });
          uploadStream.on('error', (err) => {
            debug(`GridFS 模型上傳錯誤: ${err.message}`);
            reject(err);
          });
          uploadStream.end(modelData);
        });

        // 儲存到本地 models 目錄
        const modelDir = path.join(__dirname, '../stable-diffusion/models');
        if (!fs.existsSync(modelDir)) {
          fs.mkdirSync(modelDir, { recursive: true });
        }
        
        const localPath = path.join(modelDir, `${baseFilename}${path.extname(originalFilename)}`);
        
        // 使用 try-catch 處理檔案寫入錯誤，避免因為本地寫入失敗而影響整個上傳流程
        try {
          fs.writeFileSync(localPath, modelData);
          debug(`模型檔案已儲存至本地: ${localPath}`);
        } catch (writeErr) {
          debug(`模型檔案本地儲存失敗，但仍繼續處理: ${writeErr.message}`);
        }

        // 構建回應，包含模型圖片資訊
        const response = {
          success: true,
          message: '模型檔案上傳成功',
          fileId: fileId,
          filename: baseFilename,
          originalFilename: originalFilename,
          modelType: modelType,
          size: modelSize,
          prettySize: `${(modelSize / (1024 * 1024 * 1024)).toFixed(2)} GB`,
          source: modelBuffer ? 'civitai_download' : 'user_upload'
        };
        
        // 如果有圖片，添加圖片資訊
        if (modelImageIds.length > 0) {
          response.modelImageIds = modelImageIds;
          response.modelMainImageId = modelImageIds[0];
          response.modelMainImageUrl = `${API_BASE_URL}/api/images/${modelImageIds[0]}`;
          response.totalImages = modelImageIds.length;
        }

        res.json(response);

      } catch (gridfsErr) {
        debug('GridFS error (Model):', gridfsErr);
        return res.status(500).json({ success: false, message: '模型檔案儲存失敗: ' + gridfsErr.message });
      }
    } catch (multerErr) {
      // 處理 multer 上傳錯誤
      debug('Multer error (Model):', multerErr);
      return res.status(400).json({ 
        success: false, 
        message: `檔案上傳失敗: ${multerErr.message}` 
      });
    }
  } catch (err) {
    debug('General error (Model):', err);
    res.status(500).json({ success: false, message: '模型檔案上傳失敗: ' + err.message });
  }
};

// 獲取 LoRA 檔案列表
exports.getLoraList = async (req, res) => {
  try {
    // 驗證用戶是否已登入
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '請先登入' });
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // 查詢該用戶的所有 LoRA 檔案
    const loras = await mongoose.connection.db
      .collection('loras.files')
      .find({ 'metadata.userId': decoded.id })
      .sort({ uploadDate: -1 })
      .toArray();

    // 格式化回傳資料，保留所有 metadata 資訊
    const formattedLoras = loras.map(lora => {
      const baseInfo = {
        fileId: lora._id.toString(),
        filename: lora.metadata.baseFilename,
        originalFilename: lora.filename,
        description: lora.metadata.description || '',
        uploadDate: lora.uploadDate,
        size: lora.length,
        prettySize: lora.metadata.prettySize || `${(lora.length / (1024 * 1024)).toFixed(2)} MB`
      };
      
      // 添加圖片資訊
      if (lora.metadata.loraImages && lora.metadata.loraImages.length > 0) {
        baseInfo.loraImages = lora.metadata.loraImages;
        baseInfo.loraMainImage = lora.metadata.loraMainImage || lora.metadata.loraImages[0];
        baseInfo.loraMainImageUrl = `${API_BASE_URL}/api/images/${baseInfo.loraMainImage}`;
        baseInfo.totalImages = lora.metadata.loraImages.length;
      }
      
      // 添加其他所有 metadata 資訊
      return {
        ...baseInfo,
        source: lora.metadata.source || 'user_upload',
        isExtractedFromZip: lora.metadata.isExtractedFromZip || false,
        // 合併其他可能存在的 metadata 欄位
        ...Object.fromEntries(
          Object.entries(lora.metadata).filter(([key]) => 
            !['userId', 'contentType', 'uploadDate', 'baseFilename', 'prettySize', 'fileSize'].includes(key)
          )
        )
      };
    });

    res.json({
      success: true,
      loras: formattedLoras
    });
  } catch (err) {
    debug('Error getting LoRA list:', err);
    res.status(500).json({ success: false, message: '取得 LoRA 檔案列表失敗' });
  }
};

// 獲取模型檔案列表
exports.getModelList = async (req, res) => {
  try {
    // 驗證用戶是否已登入
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '請先登入' });
    }

    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // 查詢該用戶的所有模型檔案
    const models = await mongoose.connection.db
      .collection('models.files')
      .find({ 'metadata.userId': decoded.id })
      .sort({ uploadDate: -1 })
      .toArray();

    // 格式化回傳資料，保留所有 metadata 資訊
    const formattedModels = models.map(model => {
      const baseInfo = {
        fileId: model._id.toString(),
        filename: model.metadata.baseFilename,
        originalFilename: model.filename,
        modelType: model.metadata.modelType || 'unknown',
        modelName: model.metadata.modelName || 'unknown',
        description: model.metadata.description || '',
        uploadDate: model.uploadDate,
        size: model.length,
        prettySize: model.metadata.prettySize || `${(model.length / (1024 * 1024 * 1024)).toFixed(2)} GB`
      };
      
      // 添加圖片資訊
      if (model.metadata.modelImages && model.metadata.modelImages.length > 0) {
        baseInfo.modelImages = model.metadata.modelImages;
        baseInfo.modelMainImage = model.metadata.modelMainImage || model.metadata.modelImages[0];
        baseInfo.modelMainImageUrl = `${API_BASE_URL}/api/images/${baseInfo.modelMainImage}`;
        baseInfo.totalImages = model.metadata.modelImages.length;
      }
      
      // 添加其他所有 metadata 資訊
      return {
        ...baseInfo,
        source: model.metadata.source || 'user_upload',
        modelVersionId: model.metadata.modelVersionId || 'unknown',
        modelurl: model.metadata.modelurl || 'unknown',
        // 合併其他可能存在的 metadata 欄位
        ...Object.fromEntries(
          Object.entries(model.metadata).filter(([key]) => 
            !['userId', 'contentType', 'uploadDate', 'baseFilename', 'prettySize', 'fileSize', 'modelType', 'modelName'].includes(key)
          )
        )
      };
    });

    res.json({
      success: true,
      models: formattedModels
    });
  } catch (err) {
    debug('Error getting model list:', err);
    res.status(500).json({ success: false, message: '取得模型檔案列表失敗' });
  }
};