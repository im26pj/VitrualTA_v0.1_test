var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var mongoose = require('mongoose');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/api');

var app = express();

// ======== 加入靜態前端檔案支援 ========
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));
// =====================================

// ======== CORS 設定：支援 trycloudflare.com 與內網 ========
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.0.101:3000',
  'http://192.168.0.100:3000'
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

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

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

module.exports = app;
