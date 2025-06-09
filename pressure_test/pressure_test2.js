import http from 'k6/http';
import { sleep } from 'k6';
import { b64decode } from 'k6/encoding';

//參數控制區
const max_parallel_user = 500;
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
//緩步上身版本

export const options = {
  stages: [
    // 緩升：30 秒內衝到 100 VUs
    { duration: '30s', target: 100 },
    // 緩升：1 分鐘內從 100 -> 300
    { duration: '1m', target: 300 },
    // 緩升：1 分鐘內從 300 -> 500
    { duration: '1m', target: 500 },
    // 穩定：在 500 VUs 保持 3 分鐘做壓力觀測
    { duration: '3m', target: 500 },
    // 緩降：1 分鐘內從 500 -> 0
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_failed': ['rate<0.3'], // 失敗率 < 30%
  },
};





// 登入憑證（用於需要驗證的請求）
const credentials = {
  account: 'test',
  password: '123'
};

// 測試用圖片的 base64 字串（簡短版，實際測試需要替換為真實數據）
const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==';
// 從 Data URL 中提取 base64 部分並解碼
const base64ImageData = testImage.split(',')[1];
const binaryImageDataForK6 = b64decode(base64ImageData, 'std'); // 'rawstd' 返回 ArrayBuffer -> 修改為 'std'


// 建立 chat_id 供測試使用
const chat_id = 'pressure_test' + Date.now();

// 定義 API 權重設定
const weights = [
  // 用戶相關 API
  { url: '/api/login', weight: n , method: 'POST', body: JSON.stringify(credentials) },
  {
    url: '/api/signup',
    weight: day_signup,
    method: 'POST',
    // 將 body 修改為一個函數，以便在每次請求時動態生成
    body: () => JSON.stringify({
      fullname: `Test_pressure User ${__VU}-${__ITER}`, // 使用 k6 內建變數確保唯一性
      account: `testuser_pressure_user_${__VU}_${__ITER}`,    // 使用 k6 內建變數
      password: "123",
      email: `test__pressure_User${__VU}_${__ITER}@example.com`, // 使用 k6 內建變數
      checkpassword: '123'
    }),
    isFunctionBody: true // 新增一個標記來識別這種 body 類型
  },

  /*
  // 純文字聊天相關 API
  { url: '/api/chat', weight: (talk_type_word * 0.7)  , method: 'POST', body: JSON.stringify({
    conversationHistory: [{ role: 'user', content: '你好，請簡單介紹一下台灣' }],
    isVisitor: true,
    chat_id: chat_id,
    isNewChat: true
  }), timeout: '300s'}, // 5分

  // 純文字附帶圖片聊天相關 API
  { url: '/api/chat', weight: (talk_type_word * 0.3)  , method: 'POST', body: JSON.stringify({
    conversationHistory: [{ role: 'user', content: '你好，請簡單介紹一下台灣' }],
    isVisitor: true,
    chat_id: chat_id,
    isNewChat: true,
    img_id : '6845574d372a8cf8a9a93a03',
  }), timeout: '300s'}, // 5分

  // 圖表生成 API -> json
  { url: '/api/chat', weight: talk_type_json , method: 'POST', body: JSON.stringify({
    conversationHistory: [{ role: 'user', content: '請生成一個關於資料科學的心智圖' }],
    chat_id: chat_id,
    isVisitor: true,
    isNewChat: true
  }), timeout: '330s'}, // 5分半鐘

    // 圖表生成 API -> diffusion_high
  { url: '/api/chat', weight: talk_type_img_high , method: 'POST', body: JSON.stringify({
    conversationHistory: [{ role: 'user', content: '請生成一個關於太空旅遊的圖片' }],
    chat_id: chat_id,
    model : '3.5',
    isVisitor: true,
    isNewChat: true
  }), timeout: '900s'}, // 15分鐘

    // 圖表生成 API -> diffusion_basic
  { url: '/api/chat', weight: talk_type_img_basic , method: 'POST', body: JSON.stringify({
    conversationHistory: [{ role: 'user', content: '請生成一個關於太空旅遊的圖片' }],
    chat_id: chat_id,
    model : '1.5',
    isVisitor: true,
    isNewChat: true
  }), timeout: '600s'}, // 10分鐘
  */

  // 圖片相關 API
  { 
    url: '/api/upload/image', 
    weight: day_upload_img, 
    method: 'POST', 
    body: { // 對於 multipart，body 是一個物件
      images: http.file(binaryImageDataForK6, 'test.png', 'image/png') 
    },
    isMultipart: true // <--- 新增標記
  },
  { url: '/api/images/68442e6d511485d9a48d0349', weight: day_pull_img, method: 'GET', body: null },
  //{ url: '/api/images/123456', weight: 2, method: 'DELETE', body: null },
  
  // 聊天歷史相關 API
  { url: '/api/chat/histories', weight: day_pull_talk, method: 'GET', body: null },
  { url: '/api/chat/1749024352417-4e95jwi40' , weight: 10, method: 'GET', body: null },
  //{ url: '/api/chat/' + chat_id, weight: 3, method: 'DELETE', body: null }
  

];

// 登入並獲取 token 的函數
function login() {
  const loginRes = http.post('http://localhost:3000/api/login', 
    JSON.stringify(credentials), 
    { headers: {'Content-Type': 'application/json'} }
  );
  
  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return body.token;
  }
  return null;
}

export default function () {
  // 獲取 token (對於需要認證的請求)
  const token = login();
  
  // 隨機按權重選一條路由
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