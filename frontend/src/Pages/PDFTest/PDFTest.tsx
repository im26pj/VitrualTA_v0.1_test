import React, { useState } from 'react';

export const PDFTest = () => {
  const [token, setToken] = useState('');
  const [fileId, setFileId] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  // 測試 PDF 查看功能
  const handleViewPDF = async () => {
    if (!fileId.trim()) {
      setMessage('請輸入文件 ID');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('正在獲取 PDF...');
    setMessageType('info');

    try {
      const headers: Record<string, string> = {};
      if (token.trim()) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/pdf/view/${fileId}`, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        // 創建 blob URL 用於顯示 PDF
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setMessage('✅ PDF 獲取成功！');
        setMessageType('success');
      } else {
        const errorData = await response.json().catch(() => null);
        setMessage(`❌ 錯誤: ${errorData?.error || response.statusText}`);
        setMessageType('error');
        setPdfUrl('');
      }
    } catch (error) {
      console.error('PDF 獲取失敗:', error);
      setMessage(`❌ 網路錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
      setMessageType('error');
      setPdfUrl('');
    } finally {
      setIsLoading(false);
    }
  };

  // 測試 PDF 下載功能
  const handleDownloadPDF = async () => {
    if (!fileId.trim()) {
      setMessage('請輸入文件 ID');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('正在下載 PDF...');
    setMessageType('info');

    try {
      const headers: Record<string, string> = {};
      if (token.trim()) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/pdf/download/${fileId}`, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // 創建下載連結
        const link = document.createElement('a');
        link.href = url;
        link.download = `document-${fileId}.pdf`;
        link.click();
        
        // 清理 URL
        URL.revokeObjectURL(url);
        
        setMessage('✅ PDF 下載成功！');
        setMessageType('success');
      } else {
        const errorData = await response.json().catch(() => null);
        setMessage(`❌ 錯誤: ${errorData?.error || response.statusText}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('PDF 下載失敗:', error);
      setMessage(`❌ 網路錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // 測試獲取 PDF 信息
  const handleGetPDFInfo = async () => {
    if (!fileId.trim()) {
      setMessage('請輸入文件 ID');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('正在獲取 PDF 信息...');
    setMessageType('info');

    try {
      const headers: Record<string, string> = {};
      if (token.trim()) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/pdf/info/${fileId}`, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`✅ PDF 信息獲取成功！
檔案名: ${data.fileInfo.filename}
大小: ${data.fileInfo.length} bytes
上傳時間: ${new Date(data.fileInfo.uploadDate).toLocaleString()}
是否公共: ${data.fileInfo.isPublic ? '是' : '否'}`);
        setMessageType('success');
      } else {
        const errorData = await response.json().catch(() => null);
        setMessage(`❌ 錯誤: ${errorData?.error || response.statusText}`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('獲取 PDF 信息失敗:', error);
      setMessage(`❌ 網路錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // 清除 PDF 顯示
  const handleClearPDF = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl('');
    }
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          PDF API 測試頁面
        </h1>

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">控制面板</h2>
          
          {/* Token 輸入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JWT Token (可選，用於私人文件)
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="輸入 JWT Token..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 文件 ID 輸入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文件 ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
              placeholder="輸入文件 ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 按鈕組 */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={handleViewPDF}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '處理中...' : '📄 查看 PDF'}
            </button>
            
            <button
              onClick={handleDownloadPDF}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '處理中...' : '⬇️ 下載 PDF'}
            </button>
            
            <button
              onClick={handleGetPDFInfo}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '處理中...' : 'ℹ️ 獲取信息'}
            </button>
            
            <button
              onClick={handleClearPDF}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              🗑️ 清除顯示
            </button>
          </div>

          {/* 狀態消息 */}
          {message && (
            <div className={`p-3 rounded-md ${
              messageType === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : messageType === 'error'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              <pre className="whitespace-pre-wrap font-mono text-sm">{message}</pre>
            </div>
          )}
        </div>

        {/* PDF 顯示區域 */}
        {pdfUrl && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">PDF 預覽</h2>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                width="100%"
                height="800px"
                title="PDF 預覽"
                className="border-none"
              >
                您的瀏覽器不支持 PDF 顯示。
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  點擊這裡在新窗口中打開 PDF
                </a>
              </iframe>
            </div>
          </div>
        )}

        {/* 使用說明 */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">使用說明</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>📄 查看 PDF:</strong> 在頁面中直接顯示 PDF 內容</p>
            <p><strong>⬇️ 下載 PDF:</strong> 下載 PDF 文件到本地</p>
            <p><strong>ℹ️ 獲取信息:</strong> 獲取 PDF 文件的詳細信息</p>
            <p><strong>Token:</strong> 訪問私人文件時需要，公共文件可以留空</p>
            <p><strong>文件 ID:</strong> 可以從上傳回應或文檔列表 API 中獲取</p>
          </div>
        </div>

        {/* API 端點信息 */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">API 端點</h2>
          <div className="text-sm text-gray-600 space-y-2 font-mono">
            <p><span className="text-blue-600">GET</span> /api/pdf/view/{'{fileId}'}</p>
            <p><span className="text-green-600">GET</span> /api/pdf/download/{'{fileId}'}</p>
            <p><span className="text-purple-600">GET</span> /api/pdf/info/{'{fileId}'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};