const fs = require('fs');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const ragService = require('./ragService');
const { JWT_SECRET } = require('../config/jwtConfig');

// 設定上傳目錄
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 設定 multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('只允許上傳 PDF 檔案'), false);
    }
    cb(null, true);
  }
}).single('pdf');

/**
 * 初始化 MongoDB 連接
 */
exports.init = async function() {
  try {
    await ragService.initMongoDB();
    console.log('RAG 系統初始化完成');
  } catch (error) {
    console.error('RAG 系統初始化失敗:', error);
    throw error;
  }
};

/**
 * 上傳 PDF 文件 (支援公共和私人模式)
 */
exports.uploadPdf = function(req, res) {
  upload(req, res, async function(err) {
    if (err) {
      console.error('文件上傳錯誤:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: '未提供 PDF 文件' });
      }

      // 檢查是否為公共上傳
      const isPublic = req.body.isPublic === 'true';
      let userId = null;

      // 如果是私人上傳，需要驗證用戶身份
      if (!isPublic) {
        if (!req.headers.authorization?.startsWith('Bearer ')) {
          return res.status(401).json({ success: false, error: '私人上傳需要登入' });
        }

        const token = req.headers.authorization.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.id;
        } catch (jwtErr) {
          return res.status(401).json({ success: false, error: '無效的認證token' });
        }
      }
      
      const filePath = req.file.path;
      const result = await ragService.storePdfToGridFS(filePath, 'nomic-embed-text', userId, isPublic);
      
      // 清理臨時文件
      fs.unlinkSync(filePath);
      
      res.status(200).json({
        success: true,
        documentId: result.documentId,
        fileName: result.fileName,
        isPublic: isPublic,
        message: `PDF 已成功上傳並處理 (${isPublic ? '公共' : '私人'})`
      });
    } catch (error) {
      console.error('PDF 處理失敗:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

/**
 * 執行 RAG 查詢 (支援公共和私人查詢)
 */
exports.queryRag = async function(req, res) {
  try {
    const { query, usePublicData = true, documentId } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: '請提供有效的查詢文字' 
      });
    }

    let userId = null;

    // 如果要查詢特定文檔或私人數據，需要驗證用戶身份
    if (documentId || !usePublicData) {
      if (!req.headers.authorization?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: '需要登入以查詢私人資料' });
      }

      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (jwtErr) {
        return res.status(401).json({ success: false, error: '無效的認證token' });
      }
    }

    let result;

    if (documentId) {
      // 查詢特定文檔
      result = await ragService.querySpecificDocument(documentId, query, userId);
    } else if (usePublicData) {
      // 查詢公共數據
      result = await ragService.performRagQuery(query, 'nomic-embed-text', 'llama3.2-vision:11b', null, true);
    } else {
      // 查詢用戶私人數據
      result = await ragService.performRagQuery(query, 'nomic-embed-text', 'llama3.2-vision:11b', userId, false);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('RAG 查詢失敗:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * 獲取文檔 (需要權限驗證)
 */
exports.getDocument = async function(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, error: '請提供文檔 ID' });
    }

    // 驗證用戶身份
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '需要登入以訪問文檔' });
    }

    const token = req.headers.authorization.split(' ')[1];
    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (jwtErr) {
      return res.status(401).json({ success: false, error: '無效的認證token' });
    }
    
    const document = await ragService.getDocument(id, userId);
    
    if (!document) {
      return res.status(404).json({ success: false, error: '找不到指定文檔或無權限訪問' });
    }
    
    res.status(200).json({
      success: true,
      document
    });
  } catch (error) {
    console.error('獲取文檔失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 獲取用戶的私人文檔列表
 */
exports.getUserDocuments = async function(req, res) {
  try {
    // 驗證用戶身份
    if (!req.headers.authorization?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '需要登入' });
    }

    const token = req.headers.authorization.split(' ')[1];
    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (jwtErr) {
      return res.status(401).json({ success: false, error: '無效的認證token' });
    }

    const documents = await ragService.getUserDocuments(userId);
    
    res.status(200).json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('獲取用戶文檔列表失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 獲取公共文檔列表
 */
exports.getPublicDocuments = async function(req, res) {
  try {
    const documents = await ragService.getPublicDocuments();
    
    res.status(200).json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('獲取公共文檔列表失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 下載/閱覽 PDF 文件
 */
exports.viewPdf = async function(req, res) {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ success: false, error: '請提供文件 ID' });
    }

    let userId = null;

    // 嘗試從 token 獲取用戶 ID（但不強制要求）
    if (req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (jwtErr) {
        // Token 無效但不報錯，可能是訪問公共文件
        console.log('Token 無效，嘗試訪問公共文件');
      }
    }
    
    // 獲取文件流
    const fileData = await ragService.getPdfFileStream(fileId, userId);
    
    // 設置響應頭
    res.setHeader('Content-Type', fileData.contentType);
    res.setHeader('Content-Length', fileData.length);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileData.filename)}"`);
    
    // 將文件流導向響應
    fileData.stream.pipe(res);
    
    fileData.stream.on('error', (error) => {
      console.error('文件流錯誤:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: '文件讀取失敗' });
      }
    });
    
  } catch (error) {
    console.error('PDF 閱覽失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 獲取 PDF 文件信息
 */
exports.getPdfInfo = async function(req, res) {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ success: false, error: '請提供文件 ID' });
    }

    let userId = null;

    // 嘗試從 token 獲取用戶 ID
    if (req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (jwtErr) {
        console.log('Token 無效，嘗試訪問公共文件');
      }
    }
    
    const fileInfo = await ragService.getPdfFileInfo(fileId, userId);
    
    res.status(200).json({
      success: true,
      fileInfo
    });
    
  } catch (error) {
    console.error('獲取 PDF 信息失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 下載 PDF 文件
 */
exports.downloadPdf = async function(req, res) {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ success: false, error: '請提供文件 ID' });
    }

    let userId = null;

    // 嘗試從 token 獲取用戶 ID
    if (req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (jwtErr) {
        console.log('Token 無效，嘗試訪問公共文件');
      }
    }
    
    // 獲取文件流
    const fileData = await ragService.getPdfFileStream(fileId, userId);
    
    // 設置下載響應頭
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileData.length);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileData.filename)}"`);
    
    // 將文件流導向響應
    fileData.stream.pipe(res);
    
    fileData.stream.on('error', (error) => {
      console.error('文件流錯誤:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: '文件讀取失敗' });
      }
    });
    
  } catch (error) {
    console.error('PDF 下載失敗:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};