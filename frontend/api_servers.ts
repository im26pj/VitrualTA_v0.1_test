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
    const isLocal = window.location.hostname === 'localhost';
  
    const localServers = [
      'http://localhost:3000',     // Express API server
      'ws://localhost:3000',       // WebSocket server
      'http://127.0.0.1:3000',
      'http://localhost:5000',     // Frontend dev server
      'http://134.208.97.85:3000'  // Remote server if needed
    ];
  
    const remoteServers = [
      currentHost.startsWith('http') ? currentHost : '',
      currentHost.replace('http', 'ws')  // WebSocket URL
    ].filter(Boolean);
  
    return isLocal ? localServers : remoteServers;
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
    onMessage: (content: string) => void,
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
