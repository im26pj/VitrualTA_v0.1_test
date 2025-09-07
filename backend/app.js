const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const debug = require('debug')('app:app');
const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');
const app = express();
const debugLog = debug('app:app');

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
    if (!origin) return callback(null, true);
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

// ======== MongoDB 連線設定 ========
const MONGO_URI = 'mongodb://localhost:27017/vtadb';

async function connectToMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected successfully!");
  } catch (err) {
    console.error("MongoDB connect error:", err);
    process.exit(1);
  }
}
connectToMongo(); // 在應用程式啟動時連線資料庫

app.use(cookieParser());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('trust proxy', true);

logger.format('dev-ip', function(tokens, req, res) {
  function headersSent(res) {
    return typeof res.headersSent === 'boolean'
      ? res.headersSent
      : Boolean(res._header);
  }

  var status = headersSent(res) ? res.statusCode : undefined;
  var color = status >= 500 ? 31 : status >= 400 ? 33 : status >= 300 ? 36 : status >= 200 ? 32 : 0;
  var statusStr = '\x1b[' + color + 'm' + status + '\x1b[0m';
  var contentLength = tokens.res(req, res, 'content-length');
  var remoteAddr = tokens['remote-addr'](req, res);

  return [
    tokens.method(req, res),
    tokens.url(req, res),
    statusStr,
    tokens['response-time'](req, res, 3) + ' ms',
    '-',
    contentLength || '-',
    'IP:',
    remoteAddr
  ].join(' ');
});

app.use(logger('dev-ip'));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

// API 路由要放在最前面
console.log("Setting up API router...");
app.use('/api', apiRouter);
console.log("API router is set.");

// 靜態文件路由
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../frontend/dist')));


//文件上傳路徑y
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 所有其他 GET 請求導向前端
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  debug('錯誤發生於路徑:', req.path);
  debug('錯誤詳情:', err);
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});


/*
// 建立 WebSocket 伺服器並連結到現有的 HTTP/HTTPS 伺服器
const wss = new WebSocketServer({ server });

// 將 wss 實例傳給 WebSocket 處理模組
setupWebSocketHandler(wss);
*/


module.exports = app;
