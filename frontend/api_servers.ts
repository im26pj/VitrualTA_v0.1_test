import { getAuthToken } from "./src/utils/auth";

interface ApiError {
  success: boolean;
  message: string;
}

/**
 * 取得目前可用的 API 伺服器列表
 */
const getBaseServers = (): string[] => {
  const currentOrigin = window.location.origin;
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const isCloudflare = hostname.endsWith('.trycloudflare.com');

  // ✅ 正式環境 API 清單
  const productionServers = [
    'https://virtualta.xyz',
    'https://virtualta.online',
  ];

  const localServers = [
    currentOrigin,                      // 自動推斷目前 origin
    'http://localhost:5000',           // 本機 Express API
    'http://localhost:3000',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:3000',
  ];

  const remoteServers: string[] = [];

  // ✅ Cloudflare Tunnel 處理邏輯
  if (isCloudflare) {
    const randomPart = hostname.split('.')[0];
    if (randomPart.includes('frontend')) {
      remoteServers.push(`https://${randomPart.replace('frontend', 'backend')}.trycloudflare.com`);
    } else if (randomPart.includes('backend')) {
      remoteServers.push(`https://${randomPart.replace('backend', 'frontend')}.trycloudflare.com`);
    }
  }

  // ✅ 根據執行環境決定使用哪些伺服器
  if (isLocal) {
    return localServers;
  }

  if (productionServers.includes(currentOrigin)) {
    // ✅ 前端跑在正式網址時，回傳對應的固定後端列表
    return productionServers;
  }

  return [currentOrigin, ...remoteServers].filter(Boolean);
};


/**
 * 帶 timeout 的 fetch（預設 3000ms）
 */
const fetchWithTimeout = (
  url: string,
  options: RequestInit,
  timeout: number = 3000
): Promise<Response> => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    fetch(url, { ...options, signal: controller.signal })
      .then((res) => {
        clearTimeout(id);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
};

/**
 * 支援 fallback 的 fetch 方法
 */
export const fetchWithFallback = async (
  endpoint: string,
  options?: RequestInit
): Promise<any> => {
  const serverList = getBaseServers();
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options?.headers,
  };
  let lastError: string | null = null;

  for (const base of serverList) {
    const url = `${base}${endpoint}`;
    console.log(`⚡ 嘗試連線：${url}`);

    try {
      const res = await fetchWithTimeout(url, {
        ...options,
        headers,
      });

      let data: any = {};
      const contentType = res.headers.get("Content-Type") || "";

      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch (jsonErr) {
          console.warn(`⚠️ JSON 解析失敗：${jsonErr}`);
        }
      }

      if (!res.ok) {
        lastError = data?.message || `伺服器錯誤：${res.status}`;
        console.warn(`❌ ${url} 回應錯誤：${lastError}`);
        continue;
      }

      console.log(`✅ 成功從 ${url} 獲得回應：${data?.message || '[無訊息]'}`);
      return data;

    } catch (err: any) {
      const errMsg = err?.name === 'AbortError'
        ? '連線超時'
        : err?.message || '未知錯誤';
      console.warn(`🚫 無法連線到 ${url}：${errMsg}`);
      lastError = errMsg;
      continue;
    }
  }

  throw new Error(lastError || '所有伺服器皆失敗');
};

/**
 * 支援 SSE 串流的 fetch 方法
 */
export const fetchSSEStream = async (
  endpoint: string,
  data: any,
  onMessage: (content: any) => void,  // 修改型別為 any
  onError: (error: string) => void
) => {
  const serverList = getBaseServers();
  const token = getAuthToken();
  let lastError: string | null = null;

  for (const base of serverList) {
    const url = `${base}${endpoint}`;
    console.log(`⚡ 嘗試串流連線：${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        lastError = `伺服器錯誤：${response.status}`;
        continue;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        lastError = '不支援串流讀取';
        continue;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // 處理完整的行，保留不完整的部分
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                onError(parsed.error);
              } else if (parsed.type === 'graph') {
                // 直接傳遞完整的 graph 物件
                onMessage(parsed);
              } else if (parsed.type === 'image') {
                // 處理圖片類型的回應
                onMessage({
                  type: 'image',
                  imageId: parsed.imageId,
                  image: parsed.image || {
                    fileId: parsed.imageId,
                    filename: `AI生成圖片 ${new Date().toLocaleTimeString()}`
                  }
                });
              } else if (parsed.content) {
                onMessage(parsed.content);
              }
            } catch (e) {
              // 如果不是 JSON，就當作純文字處理
              onMessage(data);
            }
          }
        }
      }

      return;

    } catch (err: any) {
      console.warn(`🚫 串流連線失敗 ${url}：${err.message}`);
      lastError = err.message;
      continue;
    }
  }

  throw new Error(lastError || '所有伺服器串流連線皆失敗');
};

// 簡化用法
export const apiGet = (endpoint: string) =>
  fetchWithFallback(endpoint, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

export const apiPost = (endpoint: string, data: any) =>
  fetchWithFallback(endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: JSON.stringify(data),
  });

export const apiPut = (endpoint: string, data: any) =>
  fetchWithFallback(endpoint, {
    method: 'PUT',
    headers: { Accept: 'application/json' },
    body: JSON.stringify(data),
  });

export const apiDelete = (endpoint: string) =>
  fetchWithFallback(endpoint, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

interface UploadImageResponse {
  success: boolean;
  images: Array<{
    fileId: string;
    filename: string;
    base64: string;
  }>;
}

export const uploadImage = async (formData: FormData): Promise<UploadImageResponse> => {
  const serverList = getBaseServers();
  const token = getAuthToken();
  let lastError: string | null = null;

  for (const base of serverList) {
    if (base.startsWith('ws')) continue; // 跳過 WebSocket URL
  
    const url = `${base}/api/upload/image`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        lastError = errorData?.message || `伺服器錯誤：${response.status}`;
        console.error(`上傳失敗：${lastError}`);
        continue;
      }

      const data = await response.json();
      return data;

    } catch (err: any) {
      lastError = err.message;
      console.error(`上傳錯誤：${lastError}`);
      continue;
    }
  }

  throw new Error(lastError || '圖片上傳失敗');
};

export const getImageUrl = (fileId: string): string => {
  // 如果是相對路徑，直接返回
  if (fileId.startsWith('/')) {
    return fileId;
  }
  
  // 檢查是否在移動設備上
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // 檢查環境
  const hostname = window.location.hostname;
  const isTestEnv = hostname === 'localhost' || hostname === '127.0.0.1';
  
  // 檢查協議
  const protocol = window.location.protocol; // 獲取當前協議 (http: 或 https:)
  
  if (isTestEnv) {
    // 測試環境使用與當前頁面相同的協議
    if (isMobile) {
      // 在移動設備上使用相對路徑，避免混合內容問題
      return `/api/images/${fileId}`;
    } else {
      // 在桌面測試環境使用與當前頁面相同的協議
      return `${protocol}//localhost:3000/api/images/${fileId}`;
    }
  }
  
  // 生產環境使用相對路徑
  return `/api/images/${fileId}`;
};

// 新增的介面
interface UploadedImage {
  _id: string;
  fileId: string;
  filename: string;
  base64: string;
}

// 新增的函式
export const deleteImage = async (fileId: string): Promise<any> => {
  return await fetchWithFallback(`/api/images/${fileId}`, {
    method: 'DELETE'
  });
};

export const getImage = async (fileId: string): Promise<Blob> => {
  const response = await fetchWithFallback(`/api/images/${fileId}`, {
    method: 'GET',
    headers: {
      'Accept': 'image/*'
    }
  });

  if (response instanceof Response) {
    return await response.blob();
  }
  
  throw new Error('獲取圖片失敗');
};

interface GenerateGraphResponse {
  success: boolean;
  graph_json: string;
}

export const generateGraph = async (
  data: { 
    isVisitor: boolean;
    chat_id?: string;
    content: string;
  },
  onMessage: (content: string) => void,
  onError: (error: string) => void
) => {
  const serverList = getBaseServers();
  const token = getAuthToken();
  let lastError: string | null = null;

  for (const base of serverList) {
    const url = `${base}/api/generate-graph`;
    console.log(`⚡ 嘗試串流連線：${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        lastError = `伺服器錯誤：${response.status}`;
        continue;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        lastError = '不支援串流讀取';
        continue;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                onError(parsed.error);
              } else if (parsed.content) {
                onMessage(parsed.content);
              }
            } catch (e) {
              console.warn('解析 SSE 數據失敗:', e);
            }
          }
        }
      }

      return;

    } catch (err: any) {
      console.warn(`🚫 串流連線失敗 ${url}：${err.message}`);
      lastError = err.message;
      continue;
    }
  }

  throw new Error(lastError || '所有伺服器串流連線皆失敗');
    throw new Error(lastError || '所有伺服器串流連線皆失敗');
  };

// 在檔案末尾添加這個新函數
export const deleteChatHistory = async (chatId: string): Promise<any> => {
  return apiDelete(`/api/chat/${chatId}`);
};

// 添加變更密碼的 API 函數
export const changePassword = async (oldPassword: string, newPassword: string): Promise<any> => {
  return apiPost('/api/cpassword', {
    oldPassword,
    newPassword
  });
};