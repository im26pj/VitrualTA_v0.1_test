var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan'); // Morgan logger
var cors = require('cors');
var mongoose = require('mongoose');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/api');
var app = express();
const debug = require('debug')('app:app'); // Your existing debug instance

// ======== 加入靜態前端檔案支援 ========
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));
// =====================================

// ======== CORS 設定 ========
const allowedOrigins = [
  'http://virtualta.xyz',
  'http://virtualta.online',
  'https://virtualta.xyz',
  'https://virtualta.online',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://134.208.97.85:5000',
  'http://134.208.97.85:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // 允許無 origin 的請求（如 curl）
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.trycloudflare.com')
    ) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed from this origin: ' + origin));
    }
  },
  credentials: true
}));
// =============================================================

// 調整 cookie 設定
app.use(cookieParser());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// 設定 trust proxy 以便 morgan 的 :remote-addr 和 req.ip 能正確獲取真實 IP (如果應用程式在反向代理之後)
app.set('trust proxy', true); // 或者更精確的設定，例如 'loopback', '127.0.0.1'

// ======== 定義新的 Morgan 日誌格式 'dev-ip' ========
logger.format('dev-ip', function(tokens, req, res) {
  // 輔助函數檢查 headers 是否已發送
  function headersSent(res) {
    return typeof res.headersSent === 'boolean'
      ? res.headersSent
      : Boolean(res._header);
  }

  var status = headersSent(res) ? res.statusCode : undefined;
  // 根據狀態碼設定顏色
  var color = status >= 500 ? 31 // red
    : status >= 400 ? 33 // yellow
    : status >= 300 ? 36 // cyan
    : status >= 200 ? 32 // green
    : 0; // no color

  // 格式化狀態碼（帶顏色）
  var statusStr = '\x1b[' + color + 'm' + status + '\x1b[0m';
  
  var contentLength = tokens.res(req, res, 'content-length');
  var remoteAddr = tokens['remote-addr'](req, res); // 使用 morgan 的 :remote-addr token

  return [
    tokens.method(req, res),
    tokens.url(req, res),
    statusStr,
    tokens['response-time'](req, res, 3) + ' ms', // 回應時間，保留3位小數
    '-', // 分隔符
    contentLength || '-', // Content length 或 '-'
    'IP:', // IP 標籤
    remoteAddr // 客戶端 IP 位址
  ].join(' ');
});

// 使用新的 'dev-ip' 日誌格式
app.use(logger('dev-ip'));

// 修改這些行，增加限制大小
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 你的自訂日誌中間件 (現在可以移除 console.log)
app.use((req, res, next) => {
  // const start = process.hrtime(); // 如果 morgan 處理了回應時間，這裡可能不再需要
  // const clientIp = req.ip || req.socket.remoteAddress; // Morgan 會處理 IP

  res.on('finish', () => {
    // const diff = process.hrtime(start);
    // const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
    // const status = res.statusCode;
    // const method = req.method;
    // const url = req.originalUrl || req.url;
    
    // 下面這行 console.log 可以移除了，因為 morgan 的 'dev-ip' 格式會記錄相似的資訊
    // console.log(`${method} ${url} ${status} ${responseTime} ms - IP: ${clientIp}`); 
  });

  // 保留這些 debug 輸出，如果你仍然需要它們進行條件式偵錯
  debug(`${new Date().toISOString()} - ${req.method} ${req.url} (from custom middleware)`);
  debug('Headers: %o', req.headers); // 使用 %o 格式化物件
  next();
});

// 掛載 api 路由
app.use('/api', apiRouter);
app.use('/users', usersRouter);
app.use('/', indexRouter);

// ======== 所有非 API 路由交給 React 處理 ========
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});
// ===================================================

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// ======== database 連線設定 ========
mongoose.connect('mongodb://localhost:27017/vtadb')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connect error:', err));

// ======== WebSocket 服務器設置 ========
const server = app.listen(3000, () => {
  console.log('Server running on port 3000');
});

const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  //console.log('New WebSocket connection');
  debug('New WebSocket connection');
  ws.on('message', (message) => {
    //console.log('Received:', message);
    debug('Received:', message);
  });
});

module.exports = app;
