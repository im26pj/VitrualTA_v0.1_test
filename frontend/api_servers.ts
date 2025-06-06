import { getAuthToken } from "./src/utils/auth";

interface ApiError {
  success: boolean;
  message: string;
}

/**
 * 取得目前可用的 API 伺服器列表
 */
const getBaseServers = (): string[] => {
  const currentHost = window.location.origin;
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost';
  const isCloudflare = hostname.endsWith('.trycloudflare.com');

  const localServers = [
    'http://localhost:3000',     // Express API server
    'http://127.0.0.1:3000',    // 移除 WebSocket URL
    'http://localhost:5000'      // Frontend dev server
  ];

  let remoteServers = [
    currentHost.startsWith('http') ? currentHost : ''
  ];

  // 如果是 Cloudflare Tunnel 網址，嘗試提取主要部分並構建可能的變體
  if (isCloudflare) {
    // 從目前網址提取 Cloudflare 網域的隨機部分
    const randomPart = hostname.split('.')[0];
    console.log(`檢測到 Cloudflare Tunnel 網址: ${randomPart}`);
    
    // 添加可能的 API 服務器變體到候選清單
    // 如果當前是前端，嘗試連接到後端；反之亦然
    if (randomPart.includes('frontend')) {
      remoteServers.push(`https://${randomPart.replace('frontend', 'backend')}.trycloudflare.com`);
    } else if (randomPart.includes('backend')) {
      remoteServers.push(`https://${randomPart.replace('backend', 'frontend')}.trycloudflare.com`);
    }
    
    // 如果有其他已知的固定服務名稱，也可以加入
    // 例如: remoteServers.push(`https://api-virtualTA.trycloudflare.com`);
  }

  return isLocal ? localServers : remoteServers.filter(Boolean);
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
  const baseServer = getBaseServers()[0]; // 使用第一個可用的伺服器
  return `${baseServer}/api/images/${fileId}`;
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