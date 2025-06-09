import http from 'k6/http';
import { sleep } from 'k6';
import { b64decode, b64encode } from 'k6/encoding'; // 新增 b64encode

//參數控制區
const max_parallel_user = 4;
const n =  5; //使用者一日登入/登出次數
const day_signup = n * 0.3; // 3成使用者是新註冊
const day_talk = n * 5; // 每日聊天次數
const day_upload_img = day_talk * 0.3; //3成對話會上傳圖片
const day_pull_talk = n + day_talk * 1.5; // 登入抓資料 + 每次對話 有1.5次 重新整理/載入 行為
const day_pull_img =  n + day_upload_img * 1.5;
const talk_type_word = day_talk * 0.6;
const talk_type_json = day_talk * 0.2;
const talk_type_img_high = day_talk * 0.1;
const talk_type_img_basic = day_talk * 0.1;


export const options = {
  vus: max_parallel_user,
  duration: '60m',
  thresholds: { 'http_req_failed': ['rate<0.3'] }
};

// 登入憑證（用於需要驗證的請求）
const credentials = {
  account: 'test',
  password: '123'
};

// --- 圖片處理修改 ---
// 測試用圖片的檔案路徑 (請將此路徑替換為您實際的圖片檔案路徑，例如 './my_test_image.png')
const testImageFilePath = './whimsical_medium.png'; // <--- 在此填入圖片檔案的路徑

// 將檔案內容轉換為 Base64 字串的函數
function fileContentToBase64(filePath) {
  try {
    // 以二進制模式讀取檔案，返回 ArrayBuffer
    const fileBytes = open(filePath, 'b');
    return b64encode(fileBytes); // 將 ArrayBuffer 編碼為 Base64 字串
  } catch (e) {
    console.error(`[VU: ${__VU}, Iter: ${__ITER}] 錯誤：讀取檔案 ${filePath} 並轉換為 Base64 失敗: ${e}`);
    return null;
  }
}

// 將指定路徑的圖片檔案轉換為 Base64 字串
const testImageAsBase64 = fileContentToBase64(testImageFilePath);

let binaryImageDataForK6;
if (testImageAsBase64) {
  // 將 Base64 字串解碼回 ArrayBuffer 供 http.file 使用
  binaryImageDataForK6 = b64decode(testImageAsBase64, 'std');
} else {
  console.warn(`[VU: ${__VU}, Iter: ${__ITER}] 警告：無法從 ${testImageFilePath} 生成 Base64 數據。上傳圖片的測試將使用一個預設的空圖片。`);
  // 提供一個空的 ArrayBuffer 作為備用，以避免 http.file 出錯
  const emptyArrayBuffer = new Uint8Array([]).buffer; // 創建一個空的 ArrayBuffer
  binaryImageDataForK6 = emptyArrayBuffer;
}
// --- 圖片處理修改結束 ---

// 建立 chat_id 供測試使用 (建議在 default function 中為每次迭代或每個 VU 生成唯一的 chat_id)
const chat_id = 'pressure_test_' + Date.now();

// 定義 API 權重設定
const weights = [
  // 用戶相關 API
  { url: '/api/login', weight: n , method: 'POST', body: JSON.stringify(credentials) },
  {
    url: '/api/signup',
    weight: day_signup,
    method: 'POST',
    body: () => JSON.stringify({
      fullname: `Test_pressure User ${__VU}-${__ITER}`,
      account: `testuser_pressure_user_${__VU}_${__ITER}`,
      password: "123",
      email: `test__pressure_User${__VU}_${__ITER}@example.com`,
      checkpassword: '123'
    }),
    isFunctionBody: true
  },

  
  // 純文字聊天相關 API
  { url: '/api/chat', weight: (talk_type_word * 0.7)  , method: 'POST', body: JSON.stringify({
    conversationHistory: [{ role: 'user', content: '你好，請簡單介紹一下台灣' }],
    isVisitor: false,
    chat_id: chat_id, // 考慮為每次迭代生成唯一 chat_id
    isNewChat: true
  }), timeout: '300s'}, // 5分

  // 純文字附帶圖片聊天相關 API
  { url: '/api/chat', weight: (talk_type_word * 0.3)  , method: 'POST', body: JSON.stringify({
    conversationHistory: [{ role: 'user', content: '你好，請簡單介紹一下台灣' }],
    isVisitor: false,
    chat_id: chat_id, // 考慮為每次迭代生成唯一 chat_id
    isNewChat: true,
    img_id : '6845574d372a8cf8a9a93a03', // 注意：此 img_id 應為已上傳圖片的 ID
  }), timeout: '300s'}, // 5分

  // 圖表生成 API -> json
  { url: '/api/chat', weight: talk_type_json , method: 'POST', body: JSON.stringify({
    conversationHistory: [{ role: 'user', content: '請生成一個關於資料科學的心智圖' }],
    chat_id: chat_id, // 考慮為每次迭代生成唯一 chat_id
    isVisitor: false,
    isNewChat: true
  }), timeout: '330s'}, // 5分半鐘

    // 圖表生成 API -> diffusion_high
  { url: '/api/chat', weight: talk_type_img_high , method: 'POST', body: JSON.stringify({
    conversationHistory: [{ role: 'user', content: '請生成一個關於太空旅遊的圖片' }],
    chat_id: chat_id, // 考慮為每次迭代生成唯一 chat_id
    model : '3.5',
    isVisitor: false,
    isNewChat: true
  }), timeout: '900s'}, // 15分鐘

    // 圖表生成 API -> diffusion_basic
  { url: '/api/chat', weight: talk_type_img_basic , method: 'POST', body: JSON.stringify({
    conversationHistory: [{ role: 'user', content: '請生成一個關於太空旅遊的圖片' }],
    chat_id: chat_id, // 考慮為每次迭代生成唯一 chat_id
    model : '1.5',
    isVisitor: false,
    isNewChat: true
  }), timeout: '600s'}, // 10分鐘
  

  // 圖片相關 API
  { 
    url: '/api/upload/image', 
    weight: day_upload_img, 
    method: 'POST', 
    body: { // 對於 multipart，body 是一個物件
      // 使用前面處理好的 binaryImageDataForK6
      images: http.file(binaryImageDataForK6, 'test_upload_image.png', 'image/png') 
    },
    isMultipart: true // <--- 新增標記
  },
  { url: '/api/images/6845bcf46b3816d4dde0f2d8', weight: day_pull_img, method: 'GET', body: null },
  //{ url: '/api/images/123456', weight: 2, method: 'DELETE', body: null },
  
  // 聊天歷史相關 API
  { url: '/api/chat/histories', weight: day_pull_talk, method: 'GET', body: null },
  { url: '/api/chat/1749400396793-8xushzjhc' , weight: 10, method: 'GET', body: null },
  //{ url: '/api/chat/' + chat_id, weight: 3, method: 'DELETE', body: null }
  

];


// 登入並獲取 token 的函數
function login() {
  const loginRes = http.post('http://localhost:3000/api/login', 
    JSON.stringify(credentials), 
    { headers: {'Content-Type': 'application/json'} }
  );
  
  if (loginRes.status === 200) {
    try {
      const body = JSON.parse(loginRes.body);
      return body.token;
    } catch (e) {
      console.error(`[VU: ${__VU}, Iter: ${__ITER}] 登入成功但解析 token 失敗: ${e}, Body: ${loginRes.body}`);
      return null;
    }
  } else {
    console.warn(`[VU: ${__VU}, Iter: ${__ITER}] 登入失敗: Status ${loginRes.status}, Body: ${loginRes.body}`);
  }
  return null;
}

export default function () {
  // 獲取 token (對於需要認證的請求)
  // 建議每次迭代或每個VU獨立登入獲取token，或使用setup function預先獲取
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NDViYTQzZWE4YjE4YjYxMmE3MGZhOSIsImFjY291bnQiOiJ0ZXN0IiwiaWF0IjoxNzQ5NDQxOTk3LCJleHAiOjE3NDk1MjgzOTd9.87Y00-HLm1kpeev6nu2L_ZBLqjcVM0Leag6qubvx0Sc"; // 保持此 token 或實現動態獲取
  
  let sum = weights.reduce((s, w) => s + w.weight, 0);
  let pick = Math.random() * sum;
  let acc = 0;
  
  for (let w of weights) {
    acc += w.weight;
    if (pick < acc) {
      const params = { headers: {} }; // 修改：使用 params 物件來組織請求參數

      // 如果 API 定義了 timeout，則加入到 params 中
      if (w.timeout) {
        params.timeout = w.timeout;
      }

      // 僅在非 /api/signup 請求時設定 Accept header
      if (w.url !== '/api/signup') {
        params.headers['Accept'] = 'application/json';
      }

      // 如果有 token 且請求的 API 不是登入或註冊，則加入 Authorization header
      if (token && w.url !== '/api/login' && w.url !== '/api/signup') {
        params.headers['Authorization'] = `Bearer ${token}`;
      }
      
      let bodyPayload;
      if (w.isFunctionBody) { // 檢查 body 是否為函數
        bodyPayload = w.body(); // 如果是，則呼叫函數以獲取動態 body
      } else {
        bodyPayload = w.body;
      }

      if (w.method === 'POST' || w.method === 'PUT') { // 適用於有請求主體的方法
        if (w.isMultipart) {
          // 對於 multipart 請求，k6 會自動設定 Content-Type
          // bodyPayload 此時是 { images: http.file(...) }
        } else {
          // 對於非 multipart (預設為 JSON)，設定 Content-Type
          // signup API 的 body 是 JSON 字串，所以需要此標頭
          params.headers['Content-Type'] = 'application/json';
          // 確保 bodyPayload 是字串 (目前 weights 中的 JSON body 已經是字串)
          // 如果 w.body 原本是物件，則應在此處 JSON.stringify(w.body)
        }
      }
      
      if (w.method === 'GET') {
        http.get(`http://localhost:3000${w.url}`, params);
      } else if (w.method === 'POST') {
        http.post(`http://localhost:3000${w.url}`, bodyPayload, params);
      } else if (w.method === 'DELETE') {
        http.del(`http://localhost:3000${w.url}`, bodyPayload, params);
      }
      // 可以根據需要添加對其他 HTTP 方法的處理
      break;
    }
  }
  
  sleep(1); // 每 VU 間隔 1s
}

// 注意：
// 1. `open()` 函數需要檔案路徑相對於執行 k6 的位置，或者是一個 k6 可以存取的絕對路徑。
/*
    通常建議將測試檔案 (如圖片) 與 k6 腳本放在一起或使用相對路徑。
    2. `console.log`, `console.warn`, `console.error` 的輸出會顯示在 k6 的終端輸出中。
    您可以將 k6 的輸出重定向到檔案：`k6 run pressure_test.js > k6_output.log 2>&1`
    3. 對於 `chat_id`，如果希望每個聊天都是獨立的，建議在 `export default function()` 內部為每次迭代生成唯一的 `chat_id`，
    例如 `const current_chat_id = `pressure_test_vu${__VU}_iter${__ITER}_${Date.now()}`;` 並在請求 body 中使用它。
    4. `img_id` 在「純文字附帶圖片聊天相關 API」中是硬編碼的。在實際測試中，這應該是一個先前透過 `/api/upload/image` 成功上傳並返回的圖片 ID。*/